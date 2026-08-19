import os
import json
import base64
import requests
import time
import sys

# Usando o gateway do Lovable
LOVABLE_API_KEY = os.environ.get("LOVABLE_API_KEY")
GITHUB_API_KEY = os.environ.get("GITHUB_API_KEY")
GATEWAY_URL = "https://connector-gateway.lovable.dev/github"

REPO_NAME = "anonymoussouto-jpg/The-Royal-Cut-Barber"

def get_all_files(directory):
    file_list = []
    for root, dirs, files in os.walk(directory):
        if any(ignored in root for ignored in [".git", "node_modules", ".lovable", "dist", ".vite", ".workspace"]):
            continue
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, directory)
            if rel_path.startswith("."):
                if rel_path not in [".gitignore", ".prettierrc", ".prettierignore", ".env", ".github"]:
                    continue
            file_list.append(rel_path)
    return file_list

def sync():
    if not LOVABLE_API_KEY or not GITHUB_API_KEY:
        sys.stderr.write("Credenciais do GitHub não encontradas. Certifique-se de que a conexão GitHub está ativa.\n")
        sys.stderr.flush()
        return

    headers = {
        "Authorization": f"Bearer {LOVABLE_API_KEY}",
        "X-Connection-Api-Key": GITHUB_API_KEY,
        "Accept": "application/vnd.github.v3+json"
    }

    # 1. Obter SHA do commit principal
    sys.stdout.write(f"Buscando estado da branch main em {REPO_NAME}...\n")
    sys.stdout.flush()
    resp = requests.get(f"{GATEWAY_URL}/repos/{REPO_NAME}/branches/main", headers=headers)
    if resp.status_code != 200:
        sys.stderr.write(f"Erro ao obter branch: {resp.status_code} - {resp.text}\n")
        sys.stderr.flush()
        return
    
    branch_data = resp.json()
    parent_commit_sha = branch_data["commit"]["sha"]

    sys.stdout.write(f"Buscando arquivos locais...\n")
    sys.stdout.flush()
    files = get_all_files(".")
    sys.stdout.write(f"Total: {len(files)} arquivos.\n")
    sys.stdout.flush()

    # 2. Criar Blobs com retry
    tree_items = []
    for i, file_path in enumerate(files):
        if os.path.isdir(file_path): continue
        if i % 10 == 0:
            sys.stdout.write(f"Processando arquivo {i}/{len(files)}: {file_path}\n")
            sys.stdout.flush()
        
        retries = 3
        success = False
        while retries > 0 and not success:
            try:
                with open(file_path, "rb") as f:
                    content = f.read()
                
                encoded_content = base64.b64encode(content).decode('utf-8')
                
                blob_resp = requests.post(
                    f"{GATEWAY_URL}/repos/{REPO_NAME}/git/blobs",
                    headers=headers,
                    json={"content": encoded_content, "encoding": "base64"},
                    timeout=30
                )
                
                if blob_resp.status_code == 201:
                    sha = blob_resp.json()["sha"]
                    tree_items.append({
                        "path": file_path.replace("\\", "/"),
                        "mode": "100755" if os.access(file_path, os.X_OK) else "100644",
                        "type": "blob",
                        "sha": sha
                    })
                    success = True
                else:
                    sys.stderr.write(f"Erro no blob {file_path} (Status {blob_resp.status_code}): {blob_resp.text}\n")
                    sys.stderr.flush()
                    retries -= 1
                    if retries > 0: time.sleep(2)
            except Exception as e:
                sys.stderr.write(f"Falha ao processar {file_path}: {e}\n")
                sys.stderr.flush()
                retries -= 1
                if retries > 0: time.sleep(2)
        
        if not success:
            sys.stderr.write(f"AVISO: Falha permanente ao enviar {file_path}. O commit continuará sem este arquivo atualizado.\n")
            sys.stderr.flush()

    # 3. Criar Árvore com retry
    sys.stdout.write("Criando nova árvore no GitHub...\n")
    sys.stdout.flush()
    new_tree_sha = None
    retries = 3
    while retries > 0 and not new_tree_sha:
        tree_resp = requests.post(
            f"{GATEWAY_URL}/repos/{REPO_NAME}/git/trees",
            headers=headers,
            json={"tree": tree_items},
            timeout=60
        )
        if tree_resp.status_code == 201:
            new_tree_sha = tree_resp.json()["sha"]
        else:
            sys.stderr.write(f"Erro ao criar árvore: {tree_resp.text}\n")
            retries -= 1
            if retries > 0: time.sleep(5)
    
    if not new_tree_sha: return

    # 4. Criar Commit com retry
    sys.stdout.write("Criando commit...\n")
    sys.stdout.flush()
    new_commit_sha = None
    retries = 3
    while retries > 0 and not new_commit_sha:
        commit_resp = requests.post(
            f"{GATEWAY_URL}/repos/{REPO_NAME}/git/commits",
            headers=headers,
            json={
                "message": sys.argv[1] if len(sys.argv) > 1 else "Update: persistence, error handling, and security fixes",
                "tree": new_tree_sha,
                "parents": [parent_commit_sha]
            },
            timeout=30
        )
        if commit_resp.status_code == 201:
            new_commit_sha = commit_resp.json()["sha"]
        else:
            sys.stderr.write(f"Erro no commit: {commit_resp.text}\n")
            retries -= 1
            if retries > 0: time.sleep(5)

    if not new_commit_sha: return

    # 5. Atualizar Referência com retry
    sys.stdout.write("Atualizando branch main...\n")
    sys.stdout.flush()
    retries = 3
    success = False
    while retries > 0 and not success:
        ref_resp = requests.patch(
            f"{GATEWAY_URL}/repos/{REPO_NAME}/git/refs/heads/main",
            headers=headers,
            json={"sha": new_commit_sha, "force": True},
            timeout=30
        )
        if ref_resp.status_code == 200:
            sys.stdout.write("GitHub sincronizado com sucesso via Gateway!\n")
            success = True
        else:
            sys.stderr.write(f"Erro ao atualizar ref: {ref_resp.text}\n")
            retries -= 1
            if retries > 0: time.sleep(5)

if __name__ == "__main__":
    sync()

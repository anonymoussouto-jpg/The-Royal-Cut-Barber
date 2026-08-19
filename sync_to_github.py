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

    # 2. Criar Blobs
    tree_items = []
    for i, file_path in enumerate(files):
        if os.path.isdir(file_path): continue
        if i % 10 == 0:
            sys.stdout.write(f"Processando arquivo {i}/{len(files)}: {file_path}\n")
            sys.stdout.flush()
        try:
            with open(file_path, "rb") as f:
                content = f.read()
            
            encoded_content = base64.b64encode(content).decode('utf-8')
            
            blob_resp = requests.post(
                f"{GATEWAY_URL}/repos/{REPO_NAME}/git/blobs",
                headers=headers,
                json={"content": encoded_content, "encoding": "base64"}
            )
            
            if blob_resp.status_code == 201:
                sha = blob_resp.json()["sha"]
                tree_items.append({
                    "path": file_path.replace("\\", "/"),
                    "mode": "100755" if os.access(file_path, os.X_OK) else "100644",
                    "type": "blob",
                    "sha": sha
                })
            else:
                sys.stderr.write(f"Erro no blob {file_path}: {blob_resp.text}\n")
                sys.stderr.flush()
        except Exception as e:
            sys.stderr.write(f"Falha ao ler {file_path}: {e}\n")
            sys.stderr.flush()

    # 3. Criar Árvore
    sys.stdout.write("Criando nova árvore no GitHub...\n")
    sys.stdout.flush()
    tree_resp = requests.post(
        f"{GATEWAY_URL}/repos/{REPO_NAME}/git/trees",
        headers=headers,
        json={"tree": tree_items}
    )
    
    if tree_resp.status_code != 201:
        sys.stderr.write(f"Erro ao criar árvore: {tree_resp.status_code} - {tree_resp.text}\n")
        sys.stderr.flush()
        return
        
    new_tree_sha = tree_resp.json()["sha"]

    # 4. Criar Commit
    sys.stdout.write("Criando commit...\n")
    sys.stdout.flush()
    commit_resp = requests.post(
        f"{GATEWAY_URL}/repos/{REPO_NAME}/git/commits",
        headers=headers,
        json={
            "message": "Update: dynamic homepage settings, Asaas payment fixes, and UI refinements",
            "tree": new_tree_sha,
            "parents": [parent_commit_sha]
        }
    )
    
    if commit_resp.status_code != 201:
        sys.stderr.write(f"Erro no commit: {commit_resp.text}\n")
        sys.stderr.flush()
        return
        
    new_commit_sha = commit_resp.json()["sha"]

    # 5. Atualizar Referência
    sys.stdout.write("Atualizando branch main...\n")
    sys.stdout.flush()
    ref_resp = requests.patch(
        f"{GATEWAY_URL}/repos/{REPO_NAME}/git/refs/heads/main",
        headers=headers,
        json={"sha": new_commit_sha, "force": True}
    )
    
    if ref_resp.status_code == 200:
        sys.stdout.write("GitHub sincronizado com sucesso via Gateway!\n")
        sys.stdout.flush()
    else:
        sys.stderr.write(f"Erro ao atualizar ref: {ref_resp.text}\n")
        sys.stderr.flush()

if __name__ == "__main__":
    sync()

import os
import json
import base64
import requests
import time

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
        print("Credenciais do GitHub não encontradas. Certifique-se de que a conexão GitHub está ativa.")
        return

    headers = {
        "Authorization": f"Bearer {LOVABLE_API_KEY}",
        "X-Connection-Api-Key": GITHUB_API_KEY,
        "Accept": "application/vnd.github.v3+json"
    }

    # 1. Obter SHA do commit principal
    print(f"Buscando estado da branch main em {REPO_NAME}...")
    resp = requests.get(f"{GATEWAY_URL}/repos/{REPO_NAME}/branches/main", headers=headers)
    if resp.status_code != 200:
        print(f"Erro ao obter branch: {resp.status_code} - {resp.text}")
        return
    
    branch_data = resp.json()
    parent_commit_sha = branch_data["commit"]["sha"]

    print(f"Buscando arquivos locais...")
    files = get_all_files(".")
    print(f"Total: {len(files)} arquivos.")

    # 2. Criar Blobs
    tree_items = []
    for file_path in files:
        if os.path.isdir(file_path): continue
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
                print(f"Erro no blob {file_path}: {blob_resp.text}")
        except Exception as e:
            print(f"Falha ao ler {file_path}: {e}")

    # 3. Criar Árvore
    print("Criando nova árvore no GitHub...")
    tree_resp = requests.post(
        f"{GATEWAY_URL}/repos/{REPO_NAME}/git/trees",
        headers=headers,
        json={"tree": tree_items}
    )
    
    if tree_resp.status_code != 201:
        print(f"Erro ao criar árvore: {tree_resp.status_code} - {tree_resp.text}")
        return
        
    new_tree_sha = tree_resp.json()["sha"]

    # 4. Criar Commit
    print("Criando commit...")
    commit_resp = requests.post(
        f"{GATEWAY_URL}/repos/{REPO_NAME}/git/commits",
        headers=headers,
        json={
            "message": "Update: favicon, SEO, and latest UI refinements",
            "tree": new_tree_sha,
            "parents": [parent_commit_sha]
        }
    )
    
    if commit_resp.status_code != 201:
        print(f"Erro no commit: {commit_resp.text}")
        return
        
    new_commit_sha = commit_resp.json()["sha"]

    # 5. Atualizar Referência
    print("Atualizando branch main...")
    ref_resp = requests.patch(
        f"{GATEWAY_URL}/repos/{REPO_NAME}/git/refs/heads/main",
        headers=headers,
        json={"sha": new_commit_sha, "force": True}
    )
    
    if ref_resp.status_code == 200:
        print("GitHub sincronizado com sucesso via Gateway!")
    else:
        print(f"Erro ao atualizar ref: {ref_resp.text}")

if __name__ == "__main__":
    sync()

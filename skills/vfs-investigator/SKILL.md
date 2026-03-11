---
name: vfs-investigator
description: Autonomous investigation tool for a Virtual File System (VFS).
---

# VFS Investigator

Este skill permite que o agente navegue, pesquise e leia arquivos em um Virtual File System (VFS) seguro, isolado do sistema de arquivos real do host. É a base da arquitetura **Agentic RAG 3.0**.

## Ferramentas

### Listar arquivos e diretórios
```bash
node {baseDir}/scripts/vfs_explorer.mjs ls "{path}"
```

### Pesquisar padrão de texto (grep)
```bash
node {baseDir}/scripts/vfs_explorer.mjs grep "{pattern}" "{path}"
```

### Ler pedaço de arquivo (evita estouro de contexto)
```bash
node {baseDir}/scripts/vfs_explorer.mjs read "{path}" {startLine} {endLine}
```

## Configuração

O VFS opera dentro de um diretório raiz definido pela variável de ambiente `SAGI_VFS_ROOT`. Por padrão, utiliza `~/.sagi/vfs_root`.

Para configurar o acesso via `openclaw.json`:
```json
{
  "skills": {
    "vfs-investigator": {
      "env": {
        "SAGI_VFS_ROOT": "/caminho/para/seu/vfs"
      }
    }
  }
}
```

## Princípios de Operação (RAG 3.0)

1. **Investigação em Camadas**: Comece com `ls` para entender a estrutura.
2. **Busca Focada**: Use `grep` para localizar informações específicas sem carregar arquivos massivos.
3. **Leitura Granular**: Use `read` com intervalos de linha para extrair apenas o necessário.

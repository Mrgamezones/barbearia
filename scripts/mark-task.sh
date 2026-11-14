#!/usr/bin/env bash
# Uso: scripts/mark-task.sh <change> <id-da-tarefa>
f="openspec/changes/$1/tasks.md"
grep -q "^- \[ \] $2 " "$f" || { echo "tarefa $2 não encontrada/pendente"; exit 1; }
sed -i "s/^- \[ \] $2 /- [x] $2 /" "$f" && echo "marcada $2"

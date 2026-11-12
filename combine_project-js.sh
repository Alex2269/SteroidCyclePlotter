#!/usr/bin/env bash
# ============================================================================
# 📦 combine_project.sh — Рекурсивне пакування файлів проєкту для AI
# ============================================================================
# Використання:
#   chmod +x combine_project.sh
#   ./combine_project.sh [ДІРЕКТОРІЯ] [ВИХІДНИЙ_ФАЙЛ]
#
# Приклади:
#   ./combine_project.sh ./raylib_scope        # склеює все в combined_project.txt
#   ./combine_project.sh . my_project_v2.txt   # пакує поточну папку в вказаний файл
# ============================================================================

set -euo pipefail

INPUT_DIR="${1:-.}"
OUTPUT_FILE="${2:-combined_project.txt}"

# Нормалізуємо шлях (прибираємо слеш в кінці, якщо є)
INPUT_DIR="${INPUT_DIR%/}"

if [[ ! -d "$INPUT_DIR" ]]; then
    echo "❌ Помилка: директорія '$INPUT_DIR' не знайдена."
    exit 1
fi

echo "🔍 Сканаю проєкт у: $INPUT_DIR"
echo "📄 Результат: $OUTPUT_FILE"
echo "⏳ Початок пакування..."

# Очищуємо вихідний файл
> "$OUTPUT_FILE"

file_count=0

# Знаходимо файли, виключаючи непотрібні директорії та бінарні/документаційні файли
# -print0 + sort -z + while read -d '' забезпечують коректну обробку пробілів в іменах
while IFS= read -r -d '' file; do
    # Відносний шлях для заголовка
    rel_path="${file#$INPUT_DIR/}"

    # Пропускаємо порожні файли та сам вихідний файл (якщо він у цій же папці)
    [[ ! -s "$file" ]] && continue
    [[ "$(basename "$file")" == "$(basename "$OUTPUT_FILE")" ]] && continue

    # Записуємо роздільник та вміст
    {
        echo '```js'
        echo "========================================"
        echo "📄 ПОЧАТОК ФАЙЛУ: $rel_path"
        echo "========================================"
        cat "$file"
        echo -e "\n========================================"
        echo "🔚 КІНЕЦЬ ФАЙЛУ: $rel_path"
        echo "========================================"
        echo '```'
        echo ""
    } >> "$OUTPUT_FILE"

    file_count=$((file_count + 1))
done < <(find "$INPUT_DIR" -type f \
    -not -path "*/.git/*" \
    -not -path "*/.svn/*" \
    -not -path "*/node_modules/*" \
    -not -path "*/__pycache__/*" \
    -not -path "*/.venv/*" \
    -not -path "*/venv/*" \
    -not -path "*/build/*" \
    -not -path "*/dist/*" \
    -not -path "*/out/*" \
    -not -path "*/fonts/*" \
    -not -path "*/docs/*" \
    -not -name "*.md" \
    -not -name "*.log" \
    -not -name "*.tmp" \
    -not -name "*.swp" \
    -not -name "*.swo" \
    -not -name "*~" \
    -not -name "*.png" -not -name "*.jpg" -not -name "*.jpeg" \
    -not -name "*.gif" -not -name "*.svg" -not -name "*.ico" \
    -not -name "*.ttf" -not -name "*.otf" -not -name "*.woff" \
    -not -name "*.bin" -not -name "*.hex" -not -name "*.elf" \
    -not -name "*.a" -not -name "*.o" -not -name "*.so" \
    -not -name "*.dll" -not -name "*.exe" \
    -print0 | LC_ALL=C sort -z)

total_kb=$(du -k "$OUTPUT_FILE" | cut -f1)
echo "✅ Готово!"
echo "📊 Оброблено файлів: $file_count"
echo "📦 Розмір результату: ${total_kb} KB"

if [[ $total_kb -gt 150 ]]; then
    echo "⚠️  Увага: файл перевищує ~150 KB. Для AI-аналізу краще розбити його на частини або видалити коментарі/логери."
fi

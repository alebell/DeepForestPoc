#!/usr/bin/env bash
set -euo pipefail

show_help() {
  cat <<'EOF'
Usage: copy-tree-to-clipboard.sh [-e EXT1,EXT2,...] [--include-binary] [--no-clipboard] PATH [PATH2 ...]
  PATH kann ein Verzeichnis oder eine Datei sein.
  -e, --ext         Kommagetrennte Liste von Dateiendungen (ohne Punkt), z.B. "kt,ts,tsx"
                    (Case-insensitive). Wird nur bei Verzeichnissen beachtet.
  --include-binary  Auch Binärdateien aufnehmen (Standard: nein).
  --no-clipboard    Nur auf STDOUT ausgeben (nicht in die Zwischenablage kopieren).
  -h, --help        Diese Hilfe.

Format:
<<<BEGIN FILE: relativer/Dateipfad>>>
<Inhalt>
<<<END FILE>>>
EOF
}

extensions=""
include_binary="false"
use_clipboard="true"

if [[ $# -eq 0 ]]; then show_help; exit 1; fi
args=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--ext)
      shift || { echo "Fehlender Wert für -e/--ext" >&2; exit 2; }
      extensions="$1"
      ;;
    --include-binary) include_binary="true" ;;
    --no-clipboard) use_clipboard="false" ;;
    -h|--help) show_help; exit 0 ;;
    -*)
      echo "Unbekannte Option: $1" >&2
      exit 2
      ;;
    *)
      args+=("$1")
      ;;
  esac
  shift || true
done

ext_list=""
if [[ -n "$extensions" ]]; then
  ext_list=",$(echo "$extensions" | tr '[:upper:]' '[:lower:]' | tr -d ' '),"
fi

copy_to_clipboard() {
  local file="$1"
  if [[ "$use_clipboard" != "true" ]]; then
    cat "$file"
    return
  fi
  if command -v pbcopy >/dev/null 2>&1; then
    pbcopy < "$file" && echo "→ In Zwischenablage (pbcopy)."
  elif command -v xclip >/dev/null 2>&1; then
    xclip -selection clipboard -i "$file" && echo "→ In Zwischenablage (xclip)."
  elif command -v xsel >/dev/null 2>&1; then
    xsel --clipboard --input < "$file" && echo "→ In Zwischenablage (xsel)."
  elif command -v wl-copy >/dev/null 2>&1; then
    wl-copy < "$file" && echo "→ In Zwischenablage (wl-copy)."
  elif command -v clip.exe >/dev/null 2>&1; then
    clip.exe < "$file" && echo "→ In Zwischenablage (clip.exe)."
  else
    echo "⚠️ Kein Clipboard-Tool gefunden. Ausgabe auf STDOUT:" >&2
    cat "$file"
  fi
}

should_include_file() {
  local f="$1"
  local skip_ext_filter="$2"

  if [[ "$skip_ext_filter" != "true" && -n "$ext_list" ]]; then
    local base="${f##*/}"
    if [[ "$base" != *.* ]]; then
      return 1
    fi
    local ext="${base##*.}"
    local ext_lc
    ext_lc="$(printf "%s" "$ext" | tr '[:upper:]' '[:lower:]')"
    [[ "$ext_list" != *,"$ext_lc",* ]] && return 1
  fi

  if [[ "$include_binary" != "true" ]]; then
    grep -Iq . "$f" 2>/dev/null || return 1
  fi
  return 0
}

tmp_out="$(mktemp -t copytree.XXXXXX)"
trap 'rm -f "$tmp_out"' EXIT

for path in "${args[@]}"; do
  if [[ -f "$path" ]]; then
    abs="$(cd "$(dirname "$path")" && pwd -P)/$(basename "$path")"
    rel="$(basename "$path")"
    if should_include_file "$abs" "true"; then
      {
        printf '<<<BEGIN FILE: %s>>>\n' "$rel"
        cat -- "$abs"
        printf '\n<<<END FILE>>>\n'
      } >> "$tmp_out"
    fi
  elif [[ -d "$path" ]]; then
    dir_abs="$(cd "$path" && pwd -P)"
    while IFS= read -r -d '' f; do
      rel="${f#$dir_abs/}"
      if should_include_file "$f" "false"; then
        {
          printf '<<<BEGIN FILE: %s>>>\n' "$rel"
          cat -- "$f"
          printf '\n<<<END FILE>>>\n'
        } >> "$tmp_out"
      fi
    done < <(find "$dir_abs" -type f -print0)
  else
    echo "⚠️ Überspringe (nicht gefunden): $path" >&2
  fi
done

copy_to_clipboard "$tmp_out"

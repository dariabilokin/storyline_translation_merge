def replace_text_keep_style(dst_cell, new_text):
    # Collect all runs in order
    runs = []
    for paragraph in dst_cell.paragraphs:
        for run in paragraph.runs:
            runs.append(run)

    # If no runs → fallback to plain text
    if not runs:
        dst_cell.text = new_text
        return

    # Replace text while preserving formatting
    idx = 0
    for run in runs:
        length = len(run.text)
        run.text = new_text[idx: idx + length]
        idx += length
        if idx >= len(new_text):
            break

    # If new_text is longer, append extra text
    if idx < len(new_text):
        last_run = runs[-1]
        last_run._r.add_t(new_text[idx:])

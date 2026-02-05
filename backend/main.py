import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File
from starlette.responses import StreamingResponse

from backend.services.merge_service import merge_docs_in_memory

app = FastAPI()


@app.get("/")
async def root():
    """Test hello world endpoint."""
    return {"message": "Hello World"}


@app.post("/merge")
async def merge_docs(original_file: UploadFile = File(...), translated_file: UploadFile = File(...)) -> StreamingResponse:
    """
    This endpoint merges translation column in 2 docx files.

    :param original_file: Source file.
    :param translated_file: Translated file.
    :return: Merged translated file.
    """
    max_upload_mb = int(os.getenv("MAX_UPLOAD_MB", "20"))
    max_upload_bytes = max_upload_mb * 1024 * 1024

    original_bytes = await original_file.read()
    translated_bytes = await translated_file.read()

    if len(original_bytes) > max_upload_bytes or len(translated_bytes) > max_upload_bytes:
        raise HTTPException(status_code=413, detail="File too large.")

    merged = merge_docs_in_memory(file_a_bytes=original_bytes, file_b_bytes=translated_bytes)

    translated_name = translated_file.filename or "translated.docx"
    translated_path = Path(translated_name)
    output_name = f"{translated_path.stem}_merged{translated_path.suffix or '.docx'}"

    return StreamingResponse(
        merged,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename={output_name}"
        },
    )

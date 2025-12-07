
from fastapi import FastAPI, UploadFile, File
from starlette.responses import StreamingResponse

from services.merge_service import merge_docs_in_memory

app = FastAPI()


@app.get("/")
async def root():
    """Test hello world endpoint."""
    return {"message": "Hello World"}

@app.post("/merge")
async def merge_docs(original_file: UploadFile = File(...), translated_file: UploadFile = File(...)) -> File(...) :
    """
    This endpoint merges translation column in 2 docx files.

    :param original_file: Source file.
    :param translated_file: Translated file.
    :return: Merged translated file.
    """
    merged = merge_docs_in_memory(
        file_a_bytes=await original_file.read(),
        file_b_bytes=await translated_file.read()
    )

    return StreamingResponse(
        merged,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": "attachment; filename=merged.docx"
        }
    )
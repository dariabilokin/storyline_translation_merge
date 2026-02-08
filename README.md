# Storyline Translation Merge

## Local Development (uv)

From the repo root:

```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Environment variables

Required (auth + database):
- `DATABASE_URL`
- `SECRET_KEY`

Optional:
- `ACCESS_TOKEN_EXPIRE_MINUTES` (default: `60`)
- `MAX_USERS` (default: `10`)
- `MAX_UPLOAD_MB` (default: `20`)
- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`

If `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` are set, the app will create an admin user on startup if one doesn't already exist.

### Quick curl test (local)

```bash
curl -s http://localhost:8000/
```

```bash
curl -X POST \
  -F "original_file=@/path/to/original.docx" \
  -F "translated_file=@/path/to/translated.docx" \
  -o /tmp/translated_merged.docx \
  http://localhost:8000/merge
```

## Deploy FastAPI on Render

Use this repo as a template to deploy a Python [FastAPI](https://fastapi.tiangolo.com) service on Render.

See https://render.com/docs/deploy-fastapi or follow the steps below:

## Manual Steps

1. You may use this repository directly or [create your own repository from this template](https://github.com/render-examples/fastapi/generate) if you'd like to customize the code.
2. Create a new Web Service on Render.
3. Specify the URL to your new repository or this repository.
4. Render will automatically detect that you are deploying a Python service and use `pip` to download the dependencies.
5. Specify the following as the Start Command.

    ```shell
    uvicorn main:app --host 0.0.0.0 --port $PORT
    ```

6. Click Create Web Service.

Or simply click:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/render-examples/fastapi)

## Thanks

Thanks to [Harish](https://harishgarg.com) for the [inspiration to create a FastAPI quickstart for Render](https://twitter.com/harishkgarg/status/1435084018677010434) and for some sample code!

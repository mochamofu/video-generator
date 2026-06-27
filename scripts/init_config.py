"""Generate config.toml for MoneyPrinterTurbo from environment variables."""
import os

use_gpu = os.environ.get("USE_GPU", "false").lower() == "true"
llm_provider = os.environ.get("LLM_PROVIDER", "openai")
openai_api_key = os.environ.get("OPENAI_API_KEY", "")
openai_base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
openai_model = os.environ.get("OPENAI_MODEL_NAME", "gpt-4o")
pexels_keys = os.environ.get("PEXELS_API_KEYS", "")
pixabay_keys = os.environ.get("PIXABAY_API_KEYS", "")

whisper_device = "cuda" if use_gpu else "cpu"
whisper_compute_type = "float16" if use_gpu else "int8"
video_codec = "h264_nvenc" if use_gpu else "libx264"

config = f"""[app]
host = "0.0.0.0"
port = 8080
debug = false

pexels_api_keys = ["{pexels_keys}"]
pixabay_api_keys = ["{pixabay_keys}"]

llm_provider = "{llm_provider}"

openai_api_key = "{openai_api_key}"
openai_base_url = "{openai_base_url}"
openai_model_name = "{openai_model}"

subtitle_provider = "edge"
video_codec = "{video_codec}"

max_concurrent_tasks = 5
max_queued_tasks = 10

[whisper]
device = "{whisper_device}"
compute_type = "{whisper_compute_type}"
model_size = "small"
"""

with open("/MoneyPrinterTurbo/config.toml", "w") as f:
    f.write(config)

print(f"Config generated: GPU={'enabled' if use_gpu else 'disabled'}, LLM={llm_provider}, device={whisper_device}")

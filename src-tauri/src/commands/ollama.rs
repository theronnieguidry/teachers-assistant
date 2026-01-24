use serde::{Deserialize, Serialize};
use std::process::Command;
use tokio::fs;
use tokio::io::AsyncWriteExt;

const OLLAMA_API_URL: &str = "http://localhost:11434";
const OLLAMA_DOWNLOAD_URL_WINDOWS: &str = "https://ollama.com/download/OllamaSetup.exe";

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaStatus {
    pub installed: bool,
    pub running: bool,
    pub version: Option<String>,
    pub models: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaModel {
    pub name: String,
    pub size: Option<String>,
    pub modified_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaTagsResponse {
    models: Option<Vec<OllamaModelInfo>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaModelInfo {
    name: String,
    size: Option<u64>,
    modified_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InstallProgress {
    pub stage: String,
    pub progress: u8,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PullProgress {
    pub status: String,
    pub completed: Option<u64>,
    pub total: Option<u64>,
}

/// Check if Ollama is installed and running
#[tauri::command]
pub async fn check_ollama_status() -> Result<OllamaStatus, String> {
    let installed = is_ollama_installed();
    let mut running = false;
    let mut version = None;
    let mut models = Vec::new();

    if installed {
        // Try to get version
        version = get_ollama_version();

        // Check if server is running by calling the API
        if let Ok(response) = reqwest::get(format!("{}/api/tags", OLLAMA_API_URL)).await {
            if response.status().is_success() {
                running = true;
                // Get list of models
                if let Ok(tags_response) = response.json::<OllamaTagsResponse>().await {
                    if let Some(model_list) = tags_response.models {
                        models = model_list.iter().map(|m| m.name.clone()).collect();
                    }
                }
            }
        }
    }

    Ok(OllamaStatus {
        installed,
        running,
        version,
        models,
    })
}

/// Install Ollama (Windows only for now)
#[tauri::command]
pub async fn install_ollama(app_handle: tauri::AppHandle) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        // Get the app data directory for downloading
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data directory: {}", e))?;

        // Create directory if it doesn't exist
        fs::create_dir_all(&app_data_dir)
            .await
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;

        let installer_path = app_data_dir.join("OllamaSetup.exe");

        // Download the installer
        let response = reqwest::get(OLLAMA_DOWNLOAD_URL_WINDOWS)
            .await
            .map_err(|e| format!("Failed to download Ollama installer: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "Failed to download Ollama installer: HTTP {}",
                response.status()
            ));
        }

        let bytes = response
            .bytes()
            .await
            .map_err(|e| format!("Failed to read installer bytes: {}", e))?;

        // Write installer to disk
        let mut file = fs::File::create(&installer_path)
            .await
            .map_err(|e| format!("Failed to create installer file: {}", e))?;

        file.write_all(&bytes)
            .await
            .map_err(|e| format!("Failed to write installer file: {}", e))?;

        // Run the installer silently
        let status = Command::new(&installer_path)
            .args(["/S"]) // Silent install flag for NSIS installers
            .status()
            .map_err(|e| format!("Failed to run Ollama installer: {}", e))?;

        // Clean up installer
        let _ = fs::remove_file(&installer_path).await;

        if status.success() {
            Ok("Ollama installed successfully".to_string())
        } else {
            Err("Ollama installation failed".to_string())
        }
    }

    #[cfg(target_os = "macos")]
    {
        // On macOS, we can use brew or direct download
        let status = Command::new("brew")
            .args(["install", "ollama"])
            .status()
            .map_err(|e| format!("Failed to install Ollama via brew: {}", e))?;

        if status.success() {
            Ok("Ollama installed successfully".to_string())
        } else {
            Err("Ollama installation failed. Please install manually from https://ollama.com/download".to_string())
        }
    }

    #[cfg(target_os = "linux")]
    {
        // On Linux, use the official install script
        let status = Command::new("sh")
            .args(["-c", "curl -fsSL https://ollama.com/install.sh | sh"])
            .status()
            .map_err(|e| format!("Failed to install Ollama: {}", e))?;

        if status.success() {
            Ok("Ollama installed successfully".to_string())
        } else {
            Err("Ollama installation failed. Please install manually from https://ollama.com/download".to_string())
        }
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Unsupported operating system for automatic Ollama installation".to_string())
    }
}

/// Start the Ollama server
#[tauri::command]
pub async fn start_ollama() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        // On Windows, start ollama serve in background
        Command::new("cmd")
            .args(["/C", "start", "/B", "ollama", "serve"])
            .spawn()
            .map_err(|e| format!("Failed to start Ollama: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        // On Unix systems, use nohup to run in background
        Command::new("sh")
            .args(["-c", "nohup ollama serve > /dev/null 2>&1 &"])
            .spawn()
            .map_err(|e| format!("Failed to start Ollama: {}", e))?;
    }

    // Wait a bit for the server to start
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    // Verify it's running
    let max_retries = 10;
    for i in 0..max_retries {
        if let Ok(response) = reqwest::get(format!("{}/api/tags", OLLAMA_API_URL)).await {
            if response.status().is_success() {
                return Ok("Ollama server started successfully".to_string());
            }
        }
        if i < max_retries - 1 {
            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        }
    }

    Err("Ollama server started but not responding. Please check manually.".to_string())
}

/// Stop the Ollama server
#[tauri::command]
pub async fn stop_ollama() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("taskkill")
            .args(["/F", "/IM", "ollama.exe"])
            .output()
            .map_err(|e| format!("Failed to stop Ollama: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new("pkill")
            .args(["-f", "ollama"])
            .output()
            .map_err(|e| format!("Failed to stop Ollama: {}", e))?;
    }

    Ok("Ollama server stopped".to_string())
}

/// Pull (download) an Ollama model
#[tauri::command]
pub async fn pull_ollama_model(model_name: String) -> Result<String, String> {
    // Use the Ollama CLI to pull the model
    let output = Command::new("ollama")
        .args(["pull", &model_name])
        .output()
        .map_err(|e| format!("Failed to pull model: {}", e))?;

    if output.status.success() {
        Ok(format!("Model '{}' pulled successfully", model_name))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to pull model '{}': {}", model_name, stderr))
    }
}

/// List available Ollama models (both local and some popular ones)
#[tauri::command]
pub async fn list_ollama_models() -> Result<Vec<OllamaModel>, String> {
    let mut models = Vec::new();

    // Try to get local models from the API
    if let Ok(response) = reqwest::get(format!("{}/api/tags", OLLAMA_API_URL)).await {
        if response.status().is_success() {
            if let Ok(tags_response) = response.json::<OllamaTagsResponse>().await {
                if let Some(model_list) = tags_response.models {
                    for model in model_list {
                        models.push(OllamaModel {
                            name: model.name,
                            size: model.size.map(|s| format_size(s)),
                            modified_at: model.modified_at,
                        });
                    }
                }
            }
        }
    }

    Ok(models)
}

/// Get recommended models for educational content generation
#[tauri::command]
pub fn get_recommended_models() -> Vec<(&'static str, &'static str, &'static str)> {
    vec![
        ("llama3.2", "3B", "Fast, good for general tasks"),
        ("llama3.2:1b", "1B", "Smallest, fastest option"),
        ("mistral", "7B", "Good balance of speed and quality"),
        ("gemma2:2b", "2B", "Google's efficient model"),
    ]
}

// Helper functions

fn is_ollama_installed() -> bool {
    #[cfg(target_os = "windows")]
    {
        Command::new("where")
            .arg("ollama")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new("which")
            .arg("ollama")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}

fn get_ollama_version() -> Option<String> {
    Command::new("ollama")
        .arg("--version")
        .output()
        .ok()
        .and_then(|output| {
            if output.status.success() {
                String::from_utf8(output.stdout)
                    .ok()
                    .map(|s| s.trim().to_string())
            } else {
                None
            }
        })
}

fn format_size(bytes: u64) -> String {
    const GB: u64 = 1024 * 1024 * 1024;
    const MB: u64 = 1024 * 1024;

    if bytes >= GB {
        format!("{:.1} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1} MB", bytes as f64 / MB as f64)
    } else {
        format!("{} bytes", bytes)
    }
}

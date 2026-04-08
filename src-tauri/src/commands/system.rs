//! 文件说明：系统级命令示例，用于验证前后端调用链已接通。

/// 返回基础健康检查信息。
#[tauri::command]
pub fn ping() -> String {
    "qingdan-desktop-ready".to_string()
}

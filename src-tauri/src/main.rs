#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/** 文件说明：Tauri 宿主层入口，负责注册插件和命令。 */
fn main() {
    qingdan_lib::run();
}

#!/usr/bin/env bash
set -e

#######################################
#           参数与变量定义
#######################################
WORK_DIR="/media/wac/backup/john/johnson/interactive_theme_park_multi_agent"
ENV_FILE=".env_prod"
BRANCH_NAME="master"
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890
export all_proxy=http://127.0.0.1:7890
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPs_PROXY=http://127.0.0.1:7890

# ANSI color
GREEN='\033[0;32m'
NC='\033[0m' # No Color

log() {
  echo -e "${GREEN}======== [ $1 ] ========${NC}"
}

#######################################
#           步骤 0：更新代码
#######################################
update_code() {
  log "Step 0: 拉取最新代码"
  cd "$WORK_DIR"
  git fetch
  git checkout "$BRANCH_NAME" || { echo "Error: 切换分支 $BRANCH_NAME 失败"; exit 1; }
  git reset --hard
  git pull --rebase || { echo "Error: Git pull 失败，可能存在未提交的更改"; exit 1; }
  echo "当前所在分支: $(git branch)"
}

#######################################
#           步骤 1：替换配置文件
#######################################
replace_config_files() {
  log "Step 1: 拷贝配置文件"
  cp "$WORK_DIR/manage_backend/.env_prod" "$WORK_DIR/manage_backend/.env"
  cp "$WORK_DIR/manage_backend/Dockerfile.prod" "$WORK_DIR/manage_backend/Dockerfile"
  cp "$WORK_DIR/manage_frontend/.env_prod" "$WORK_DIR/manage_frontend/.env"
  cp "$WORK_DIR/manage_frontend/Dockerfile.prod" "$WORK_DIR/manage_frontend/Dockerfile"
  cp "$WORK_DIR/tour_backend/.env_prod" "$WORK_DIR/tour_backend/.env"
  cp "$WORK_DIR/tour_backend/Dockerfile.prod" "$WORK_DIR/tour_backend/Dockerfile"
  cp "$WORK_DIR/xiaozhi-webui/.env_prod" "$WORK_DIR/xiaozhi-webui/.env"
  cp "$WORK_DIR/xiaozhi-webui/Dockerfile.prod" "$WORK_DIR/xiaozhi-webui/Dockerfile"
  cp "$WORK_DIR/xiaozhi_web/.env_prod" "$WORK_DIR/xiaozhi_web/.env"
  cp "$WORK_DIR/xiaozhi_web/Dockerfile.prod" "$WORK_DIR/xiaozhi_web/Dockerfile"
}

#######################################
#           步骤 2：安装依赖
#######################################


#######################################
#           步骤 3：构建并启动容器（后端）
#######################################
restart_backend_frontend() {
  log "Step 3: 重启前后端容器"
  cd "$WORK_DIR"
  docker compose up --build -d
}

#######################################
#           主执行流程
#######################################
main() {
  update_code
  replace_config_files
  restart_backend_frontend
  log "🎉 系统部署完成！"
}

main "$@"

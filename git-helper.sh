#!/bin/bash

# 🎨 Color Codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 🖼️ Header Function
show_header() {
    clear
    echo -e "${BLUE}==============================================${NC}"
    echo -e "${BLUE}   🚀 IdealAICompanion GitHub 助手 (Git Helper)${NC}"
    echo -e "${BLUE}==============================================${NC}"
    echo ""
}

# 🔄 Main Menu
main_menu() {
    show_header
    echo -e "请选择一个操作 (输入数字并回车):"
    echo ""
    echo -e "${GREEN}1.${NC} 🔗 首次关联仓库 (Link Repository)"
    echo -e "${GREEN}2.${NC} ☁️  推送代码 (Push Code)"
    echo -e "${GREEN}3.${NC} ⬇️  拉取更新 (Pull Code)"
    echo -e "${GREEN}4.${NC} 🔍 查看状态 (Check Status)"
    echo -e "${GREEN}5.${NC} 🚪 退出 (Exit)"
    echo ""
    read -p "您的选择: " choice

    case $choice in
        1) link_repo ;;
        2) push_code ;;
        3) pull_code ;;
        4) check_status ;;
        5) exit 0 ;;
        *) echo -e "${RED}❌ 无效选择，请重试${NC}"; sleep 1; main_menu ;;
    esac
}

# 1. Link Repo
link_repo() {
    show_header
    echo -e "${YELLOW}🔗 首次关联仓库${NC}"
    echo "请登录 GitHub 创建一个空仓库，然后复制它的 HTTPS 地址。"
    echo "格式如: https://github.com/username/repo.git"
    echo ""
    read -p "请粘贴仓库地址: " repo_url

    if [[ -z "$repo_url" ]]; then
        echo -e "${RED}❌ 地址不能为空${NC}"
        sleep 2
        main_menu
        return
    fi

    echo -e "\n🔄 正在关联..."
    git remote remove origin 2>/dev/null
    git remote add origin "$repo_url"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 关联成功！${NC}"
        echo -e "正在尝试首次推送..."
        git branch -M main
        git push -u origin main
        echo -e "${GREEN}✨ 全部完成！此后只需要使用 [2. 推送代码] 即可。${NC}"
    else
        echo -e "${RED}❌ 关联失败，请检查地址是否正确。${NC}"
    fi
    
    read -p "按回车键返回菜单..."
    main_menu
}

# 2. Push Code
push_code() {
    show_header
    echo -e "${YELLOW}☁️  推送代码到 GitHub${NC}"
    
    # Check if remote exists
    remote_check=$(git remote -v)
    if [[ -z "$remote_check" ]]; then
        echo -e "${RED}❌ 尚未关联远程仓库，请先选择 [1. 首次关联仓库]${NC}"
        read -p "按回车键返回菜单..."
        main_menu
        return
    fi

    echo -e "正在检查变更..."
    if [[ -z $(git status -s) ]]; then
        echo -e "${GREEN}✅ 当前没有需要提交的更改。${NC}"
    else
        echo -e "${YELLOW}发现以下文件有变动:${NC}"
        git status -s
        echo ""
        read -p "请输入提交说明 (例如: 更新了功能X): " commit_msg
        if [[ -z "$commit_msg" ]]; then
            commit_msg="Update code"
        fi

        echo -e "\n📦 正在打包..."
        git add .
        git commit -m "$commit_msg"
        
        echo -e "🚀 正在推送..."
        git push
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ 推送成功！${NC}"
        else
            echo -e "${RED}❌ 推送失败。可能需要先拉取最新代码 (选择菜单 3)。${NC}"
        fi
    fi

    read -p "按回车键返回菜单..."
    main_menu
}

# 3. Pull Code
pull_code() {
    show_header
    echo -e "${YELLOW}⬇️  拉取最新代码${NC}"
    git pull
    read -p "按回车键返回菜单..."
    main_menu
}

# 4. Check Status
check_status() {
    show_header
    echo -e "${YELLOW}🔍 当前仓库状态${NC}"
    echo "--------------------------------"
    git status
    echo "--------------------------------"
    echo ""
    git remote -v
    echo ""
    read -p "按回车键返回菜单..."
    main_menu
}

# Start
chmod +x "$0" 2>/dev/null
main_menu

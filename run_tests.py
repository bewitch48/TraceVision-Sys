#!/usr/bin/env python
"""
TraceVision 统一测试运行器
==========================
一键运行所有测试套件：后端单元/集成测试 + 前端测试 + E2E 测试

用法：
    python run_tests.py                    # 运行全部测试
    python run_tests.py --backend          # 仅后端
    python run_tests.py --frontend         # 仅前端
    python run_tests.py --e2e              # 仅E2E
    python run_tests.py --all --html       # 生成 HTML 报告
"""
import json
import os
import subprocess
import sys
import time
import argparse
from datetime import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
CODE_DIR = os.path.join(ROOT, "code")
FRONT_DIR = os.path.join(ROOT, "front", "app")
TEST_DIR = os.path.join(CODE_DIR, "tests")
REPORT_DIR = os.path.join(ROOT, "test_reports")

TESTS = {
    "backend": {
        "name": "后端 API 测试 (pytest)",
        "cwd": CODE_DIR,
        "cmd": [
            sys.executable, "-m", "pytest",
            "tests/test_backend.py",
            "-v", "--tb=short", "--color=yes",
            "-p", "no:warnings",
            "--junitxml", os.path.join(REPORT_DIR, "junit_backend.xml"),
        ],
        "report_file": os.path.join(REPORT_DIR, "junit_backend.xml"),
    },
    "frontend": {
        "name": "前端测试 (vitest)",
        "cwd": FRONT_DIR,
        "cmd": ["npx", "vitest", "run", "--config", "vitest.config.ts"],
        "report_file": os.path.join(FRONT_DIR, "test_report_frontend.xml"),
    },
    "e2e": {
        "name": "端到端测试 (E2E)",
        "cwd": CODE_DIR,
        "cmd": [sys.executable, "tests/test_e2e.py"],
        "report_file": os.path.join(TEST_DIR, "e2e_report.json"),
    },
}


class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    RESET = "\033[0m"


def cprint(color: str, text: str):
    print(f"{color}{text}{Colors.RESET}")


def print_header(text: str):
    print(f"\n{Colors.CYAN}{'=' * 60}{Colors.RESET}")
    cprint(Colors.BOLD, f"  {text}")
    print(f"{Colors.CYAN}{'=' * 60}{Colors.RESET}\n")


def run_suite(suite_key: str) -> dict:
    """运行一个测试套件，返回执行结果"""
    suite = TESTS[suite_key]
    cprint(Colors.YELLOW, f">>> 开始: {suite['name']}")

    start = time.time()
    try:
        result = subprocess.run(
            suite["cmd"],
            cwd=suite["cwd"],
            capture_output=True,
            text=True,
            timeout=300,
            env={**os.environ, "PYTHONPATH": CODE_DIR},
        )
        elapsed = time.time() - start
        passed = result.returncode == 0

        # 打印输出
        for line in result.stdout.split("\n"):
            if line.strip():
                prefix = "  "
                if "PASSED" in line or "passed" in line.lower():
                    cprint(Colors.GREEN, f"{prefix}✅ {line.strip()}")
                elif "FAILED" in line or "error" in line.lower():
                    cprint(Colors.RED, f"{prefix}❌ {line.strip()}")
                elif "WARNING" in line:
                    cprint(Colors.YELLOW, f"{prefix}⚠️ {line.strip()}")
                else:
                    print(f"{prefix}{line.strip()[:120]}")

        if result.stderr.strip():
            # 只显示关键错误行
            err_lines = [l for l in result.stderr.split("\n") if "Error" in l or "error" in l.lower()]
            for line in err_lines[:5]:
                cprint(Colors.RED, f"  ERR: {line.strip()[:120]}")

        # 解析测试统计
        test_count, test_passed, test_failed = 0, 0, 0
        for line in result.stdout.split("\n"):
            if "passed" in line and "failed" in line:
                # pytest: "23 passed, 2 failed, 3 warnings"
                # vitest: "Tests  20 passed (40)"
                import re
                passed_m = re.search(r"(\d+)\s+passed", line)
                failed_m = re.search(r"(\d+)\s+failed", line)
                if passed_m:
                    test_passed = int(passed_m.group(1))
                if failed_m:
                    test_failed = int(failed_m.group(1))
                test_count = test_passed + test_failed

        return {
            "suite": suite_key,
            "passed": passed,
            "test_count": test_count,
            "tests_passed": test_passed,
            "tests_failed": test_failed,
            "elapsed": round(elapsed, 1),
            "returncode": result.returncode,
        }

    except subprocess.TimeoutExpired:
        elapsed = time.time() - start
        cprint(Colors.RED, "  ❌ 超时 (5 分钟)")
        return {
            "suite": suite_key,
            "passed": False,
            "test_count": 0,
            "tests_passed": 0,
            "tests_failed": 0,
            "elapsed": round(elapsed, 1),
            "returncode": -1,
            "error": "timeout",
        }
    except FileNotFoundError as e:
        elapsed = time.time() - start
        cprint(Colors.RED, f"  ❌ 命令未找到: {e}")
        return {
            "suite": suite_key,
            "passed": False,
            "test_count": 0,
            "tests_passed": 0,
            "tests_failed": 0,
            "elapsed": round(elapsed, 1),
            "returncode": -1,
            "error": str(e),
        }


def generate_summary(results: list) -> dict:
    """生成汇总报告"""
    total_tests = sum(r.get("test_count", 0) for r in results)
    total_passed = sum(r.get("tests_passed", 0) for r in results)
    total_failed = sum(r.get("tests_failed", 0) for r in results)
    all_passed = all(r.get("returncode", -1) == 0 for r in results)

    summary = {
        "timestamp": datetime.now().isoformat(),
        "runner": "run_tests.py",
        "results": results,
        "total_suites": len(results),
        "total_tests": total_tests,
        "total_passed": total_passed,
        "total_failed": total_failed,
        "all_passed": all_passed,
        "pass_rate": round(total_passed / total_tests * 100, 1) if total_tests > 0 else 0,
    }

    # 保存 JSON 报告
    json_path = os.path.join(REPORT_DIR, "test_summary.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    return summary


def print_summary(summary: dict):
    """打印最终汇总"""
    print_header("测试汇总报告")
    print(f"  时间: {summary['timestamp']}")
    print(f"  套件数: {summary['total_suites']} | 用例总数: {summary['total_tests']}")
    print(f"  {Colors.GREEN}通过: {summary['total_passed']}{Colors.RESET} | "
          f"{Colors.RED}失败: {summary['total_failed']}{Colors.RESET} | "
          f"通过率: {summary['pass_rate']}%")
    print()

    for r in summary["results"]:
        status = "✅ 通过" if r.get("returncode", -1) == 0 else "❌ 失败"
        c = Colors.GREEN if r.get("passed") else Colors.RED
        err = f" ({r.get('error', '')})" if r.get("error") else ""
        print(f"  {c}{status}{Colors.RESET} {TESTS[r['suite']]['name']}: "
              f"{r.get('tests_passed', 0)}/{r.get('test_count', 0)} 通过, "
              f"{r.get('elapsed', 0)}s{err}")

    if summary["all_passed"]:
        print(f"\n  {Colors.GREEN}{Colors.BOLD}🎉 全部测试通过！{Colors.RESET}")
    else:
        print(f"\n  {Colors.RED}{Colors.BOLD}⚠️ 存在失败测试，请检查报告。{Colors.RESET}")

    print(f"\n  详细报告: {os.path.join(REPORT_DIR, 'test_summary.json')}")


def main():
    parser = argparse.ArgumentParser(description="TraceVision 统一测试运行器")
    parser.add_argument("--all", action="store_true", help="运行所有测试")
    parser.add_argument("--backend", action="store_true", help="仅运行后端测试")
    parser.add_argument("--frontend", action="store_true", help="仅运行前端测试")
    parser.add_argument("--e2e", action="store_true", help="仅运行 E2E 测试")
    parser.add_argument("--html", action="store_true", help="生成 HTML 报告（需 pytest-html）")
    parser.add_argument("--coverage", action="store_true", help="附加覆盖率报告")
    args = parser.parse_args()

    # 默认全部
    if not any([args.backend, args.frontend, args.e2e]):
        args.all = True

    # 创建报告目录
    os.makedirs(REPORT_DIR, exist_ok=True)

    # 选择要运行的套件
    suites_to_run = []
    if args.all:
        suites_to_run = ["backend", "frontend", "e2e"]
    if args.backend:
        suites_to_run.append("backend")
    if args.frontend:
        suites_to_run.append("frontend")
    if args.e2e:
        suites_to_run.append("e2e")

    # 如果请求 HTML 报告
    if args.html and "backend" in suites_to_run:
        TESTS["backend"]["cmd"].extend(["--html", os.path.join(REPORT_DIR, "report_backend.html")])
    if args.coverage and "backend" in suites_to_run:
        TESTS["backend"]["cmd"].extend(["--cov=.", "--cov-report=html:" + os.path.join(REPORT_DIR, "coverage")])

    print_header(f"TraceVision 统一测试运行器")
    print(f"  测试套件: {', '.join(TESTS[s]['name'] for s in suites_to_run)}")
    print(f"  报告目录: {REPORT_DIR}\n")

    total_start = time.time()
    results = []

    for suite_key in suites_to_run:
        result = run_suite(suite_key)
        results.append(result)

    total_elapsed = time.time() - total_start

    # 汇总
    summary = generate_summary(results)
    summary["total_elapsed"] = round(total_elapsed, 1)
    print_summary(summary)

    return 0 if summary["all_passed"] else 1


if __name__ == "__main__":
    sys.exit(main())

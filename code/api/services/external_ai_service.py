import os
import time
import requests
import base64
import json
from PIL import Image
import numpy as np

class ExternalAIService:
    def __init__(self):
        self.api_key = os.environ.get("DASHSCOPE_API_KEY", "")
        # 阿里云百炼万相2.1 图像编辑 API（北京地域）- 正确端点
        self.api_url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis"
        self.task_url = "https://dashscope.aliyuncs.com/api/v1/tasks"
    
    def inpaint(self, image_base64: str, mask_base64: str, prompt: str) -> str:
        """调用通义万相 wanx2.1-imageedit 进行局部重绘"""
        print(f"[API DEBUG] 开始调用阿里云通义万相 API")
        print(f"[API DEBUG] 提示词: {prompt}")
        
        if not self.api_key:
            raise ValueError("未配置阿里云 API Key")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-DashScope-Async": "enable"
        }
        
        # Data URI 格式（官方支持 Base64）
        base_image_url = f"data:image/png;base64,{image_base64}"
        mask_image_url = f"data:image/png;base64,{mask_base64}"
        
        payload = {
            "model": "wanx2.1-imageedit",
            "input": {
                "function": "description_edit_with_mask",
                "prompt": prompt,
                "base_image_url": base_image_url,
                "mask_image_url": mask_image_url
            },
            "parameters": {
                "n": 1
            }
        }
        
        try:
            # 步骤1: 提交异步任务
            print(f"[API DEBUG] 提交任务到: {self.api_url}")
            response = requests.post(self.api_url, headers=headers, json=payload, timeout=30)
            print(f"[API DEBUG] 响应状态码: {response.status_code}")
            
            result = response.json()
            print(f"[API DEBUG] 响应内容: {json.dumps(result, indent=2, ensure_ascii=False)[:500]}")
            
            response.raise_for_status()
            
            task_id = result.get("output", {}).get("task_id")
            if not task_id:
                raise ValueError(f"未获取到 task_id: {result}")
            
            # 步骤2: 轮询任务状态
            print(f"[API DEBUG] 任务ID: {task_id}, 开始轮询...")
            image_url = self._poll_task(task_id, headers)
            
            # 步骤3: 下载生成的图片
            print(f"[API DEBUG] 下载结果图片: {image_url[:50]}...")
            image_response = requests.get(image_url, timeout=30)
            image_response.raise_for_status()
            return base64.b64encode(image_response.content).decode('utf-8')
        
        except requests.exceptions.RequestException as e:
            print(f"[API DEBUG] 请求失败: {str(e)}")
            raise RuntimeError(f"API 请求失败: {str(e)}")
    
    def style_transfer(self, image_base64: str, prompt: str) -> str:
        """调用通义万相 stylization_all 进行全图风格迁移（保留原图结构）"""
        print(f"[API DEBUG] 风格迁移 - 提示词: {prompt}")
        
        if not self.api_key:
            raise ValueError("未配置阿里云 API Key")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-DashScope-Async": "enable"
        }
        
        payload = {
            "model": "wanx2.1-imageedit",
            "input": {
                "function": "stylization_all",
                "prompt": prompt,
                "base_image_url": f"data:image/png;base64,{image_base64}",
            },
            "parameters": {"n": 1}
        }
        
        try:
            print(f"[API DEBUG] 提交风格迁移任务: {self.api_url}")
            response = requests.post(self.api_url, headers=headers, json=payload, timeout=30)
            print(f"[API DEBUG] 响应状态码: {response.status_code}")
            
            result = response.json()
            print(f"[API DEBUG] 响应: {json.dumps(result, indent=2, ensure_ascii=False)[:300]}")
            response.raise_for_status()
            
            task_id = result.get("output", {}).get("task_id")
            if not task_id:
                raise ValueError(f"未获取到 task_id: {result}")
            
            print(f"[API DEBUG] 风格迁移任务ID: {task_id}")
            image_url = self._poll_task(task_id, headers)
            
            print(f"[API DEBUG] 下载风格迁移结果: {image_url[:50]}...")
            image_response = requests.get(image_url, timeout=30)
            image_response.raise_for_status()
            return base64.b64encode(image_response.content).decode('utf-8')
        
        except requests.exceptions.RequestException as e:
            print(f"[API DEBUG] 风格迁移失败: {str(e)}")
            raise RuntimeError(f"风格迁移 API 请求失败: {str(e)}")
    
    def _poll_task(self, task_id: str, headers: dict, max_wait: int = 120) -> str:
        """轮询异步任务直到完成"""
        start_time = time.time()
        while time.time() - start_time < max_wait:
            response = requests.get(f"{self.task_url}/{task_id}", headers=headers, timeout=10)
            response.raise_for_status()
            result = response.json()
            
            status = result.get("output", {}).get("task_status", "")
            print(f"[API DEBUG] 任务状态: {status} ({time.time() - start_time:.0f}s)")
            
            if status == "SUCCEEDED":
                results = result.get("output", {}).get("results", [])
                if results:
                    url = results[0].get("url", "")
                    if url:
                        return url
                raise ValueError("任务完成但无结果图片 URL")
            elif status == "FAILED":
                raise ValueError(f"任务失败: {result.get('output', {}).get('message', '未知错误')}")
            
            time.sleep(2)
        
        raise TimeoutError(f"任务超时 ({max_wait}s)")

external_ai_service = ExternalAIService()

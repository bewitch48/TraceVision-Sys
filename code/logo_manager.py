import json
import os
import numpy as np
from PIL import Image


class LogoManager:
    def __init__(self, db_path="../logo_database.json", logo_dir="../logos"):
        self.db_path = db_path
        self.logo_dir = logo_dir
        os.makedirs(logo_dir, exist_ok=True)
        if os.path.exists(db_path):
            with open(db_path, 'r', encoding='utf-8') as f:
                self.db = json.load(f)
        else:
            self.db = {"next_id": 1, "entries": {}}
            self.save()

    def save(self):
        with open(self.db_path, 'w', encoding='utf-8') as f:
            json.dump(self.db, f, ensure_ascii=False, indent=2)

    def add_logo(self, company_name="", logo_image=None):
        """添加新logo/版权信息，返回分配的数字ID"""
        logo_id = self.db["next_id"]
        self.db["next_id"] += 1

        logo_filename = None
        if logo_image is not None:
            logo_filename = f"{logo_id}.png"
            logo_path = os.path.join(self.logo_dir, logo_filename)
            if isinstance(logo_image, np.ndarray):
                if logo_image.max() <= 1.0:
                    logo_image = (logo_image * 255).astype(np.uint8)
                else:
                    logo_image = logo_image.astype(np.uint8)
                img = Image.fromarray(logo_image)
                img.save(logo_path)

        self.db["entries"][str(logo_id)] = {
            "company": company_name,
            "logo": logo_filename
        }
        self.save()
        return logo_id

    def get_logo(self, logo_id):
        """根据ID查询logo信息，返回 {company, logo_path} 或 None"""
        entry = self.db["entries"].get(str(logo_id))
        if entry is None:
            return None
        
        result = {
            "company": entry.get("company", ""),
            "logo_path": None
        }
        logo_file = entry.get("logo")
        if logo_file:
            logo_path = os.path.join(self.logo_dir, logo_file)
            if os.path.exists(logo_path):
                result["logo_path"] = logo_path
        return result

    def list_logos(self):
        """返回所有logo的列表，用于下拉框 [(label, id), ...]"""
        choices = []
        for sid, entry in self.db["entries"].items():
            label = f"ID:{sid}"
            if entry.get("company"):
                label += f" | {entry['company']}"
            choices.append((label, int(sid)))
        return choices

    @staticmethod
    def id_to_bits(logo_id):
        """将32位ID编码为64bit（低32位重复两次）"""
        arr = np.zeros(64, dtype=int)
        for i in range(32):
            bit = (logo_id >> i) & 1
            arr[i] = bit
            arr[i + 32] = bit
        return arr

    @staticmethod
    def bits_to_id(bits):
        """将64bit解码为ID，带容错校验
        
        编码格式：前32位（low）+ 后32位（high）= 相同数据冗余两份
        解码策略：low/high 一致位直接取，冲突位取 0（多数 ID 编码稀疏）
        """
        if len(bits) != 64:
            return None, 0.0
        
        bits = bits.astype(int)
        low = bits[:32]
        high = bits[32:]
        
        hamming_dist = np.sum(low != high)
        confidence = 1.0 - (hamming_dist / 32.0)
        
        # 超过5bit差异认为严重损坏
        if hamming_dist > 5:
            return None, confidence
        
        # 取 low/high 一致的位（冲突位按 0 处理，容忍 2 个半各错 1 位）
        logo_id = 0
        for i in range(32):
            if low[i] == high[i]:
                logo_id |= (int(low[i]) << i)
            # 冲突位：low[i] != high[i]，无法确定正确值，按 0 处理
        
        return int(logo_id), float(confidence)

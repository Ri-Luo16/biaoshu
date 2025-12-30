import json
import re
from typing import Tuple, Any

def clean_json_string(json_str: str) -> str:
    """
    清理 JSON 字符串，移除可能存在的 Markdown 代码块标记和 DeepSeek 的 think 块
    """
    # 移除 think 块
    json_str = re.sub(r'<think>.*?</think>', '', json_str, flags=re.DOTALL)
    
    # 移除 Markdown 代码块标记
    json_str = re.sub(r'```json\s*(.*?)\s*```', r'\1', json_str, flags=re.DOTALL)
    json_str = re.sub(r'```\s*(.*?)\s*```', r'\1', json_str, flags=re.DOTALL)
    
    return json_str.strip()

def check_json(json_str: str, schema: str | dict | list) -> Tuple[bool, str]:
    """
    根据模板 JSON 校验目标字符串的格式是否符合要求
    """
    try:
        # 清理并解析输入的 JSON 字符串
        json_str = clean_json_string(json_str)
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            return False, f"JSON 解析错误: {e}\n内容: {json_str[:100]}..."
        
        # 处理 schema 参数
        try:
            if isinstance(schema, str):
                schema = json.loads(schema)
            elif not isinstance(schema, (dict, list)):
                return False, "schema 必须是 JSON 字符串、字典或列表对象"
        except json.JSONDecodeError as e:
            return False, f"schema 解析错误: {e}"
        
        def check_structure(target: Any, template: Any, path: str = "") -> Tuple[bool, str]:
            # 处理数字类型
            if isinstance(template, (int, float)) and isinstance(target, (int, float)):
                return True, ""
                
            # 检查基本数据类型
            if type(template) is not type(target) and not (isinstance(template, (int, float)) and isinstance(target, (int, float))):
                return False, f"路径 '{path}' 的类型不匹配: 期望 {type(template).__name__}, 实际 {type(target).__name__}"
                
            # 如果是列表类型
            if isinstance(template, list):
                if not template:  # 如果模板列表为空，则允许任何列表
                    return True, ""
                if not target:  # 如果目标列表为空，但模板不为空
                    return False, f"路径 '{path}' 的列表为空，但期望有内容"
                    
                template_item = template[0]
                for i, item in enumerate(target):
                    is_valid, error = check_structure(item, template_item, f"{path}[{i}]")
                    if not is_valid:
                        return False, error
                return True, ""
                
            # 如果是字典类型
            elif isinstance(template, dict):
                for key in template:
                    if key not in target:
                        return False, f"路径 '{path}' 缺少必需的键 '{key}'"
                    is_valid, error = check_structure(target[key], template[key], f"{path}.{key}")
                    if not is_valid:
                        return False, error
                return True, ""
                
            return True, ""
                
        is_valid, error = check_structure(data, schema)
        return is_valid, error if not is_valid else ""
        
    except Exception as e:
        return False, f"未预期的错误: {e}"

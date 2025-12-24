"""测试后端API接口"""
import requests
import os

# 找到最新上传的文件
upload_dir = "uploads"
files = [f for f in os.listdir(upload_dir) if f.endswith('.docx')]
if not files:
    print("没有找到测试文件")
    exit(1)

files.sort(key=lambda x: os.path.getmtime(os.path.join(upload_dir, x)), reverse=True)
test_file = os.path.join(upload_dir, files[0])

print(f"测试文件: {test_file}")
print(f"文件大小: {os.path.getsize(test_file)} 字节\n")

# 测试上传接口
url = "http://127.0.0.1:8000/api/document/upload"

print(f"[1] 测试上传接口: {url}")
print("-" * 60)

try:
    with open(test_file, 'rb') as f:
        files_data = {'file': (os.path.basename(test_file), f, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
        response = requests.post(url, files=files_data, timeout=30)
    
    print(f"状态码: {response.status_code}")
    print(f"响应头: {dict(response.headers)}\n")
    
    if response.status_code == 200:
        data = response.json()
        print(f"[OK] 请求成功!")
        print(f"响应数据结构:")
        print(f"  - success: {data.get('success')}")
        print(f"  - message: {data.get('message')}")
        print(f"  - filename: {data.get('filename')}")
        print(f"  - size: {data.get('size')}")
        print(f"  - file_content 存在: {bool(data.get('file_content'))}")
        
        if data.get('file_content'):
            content = data.get('file_content')
            print(f"  - file_content 长度: {len(content)} 字符")
            print(f"\n前 300 个字符:")
            print("-" * 60)
            print(content[:300])
            print("-" * 60)
        else:
            print(f"\n[ERROR] file_content 为空!")
            print(f"完整响应: {data}")
    else:
        print(f"[ERROR] 请求失败")
        print(f"响应内容: {response.text}")
        
except Exception as e:
    print(f"[ERROR] 请求异常: {e}")
    import traceback
    traceback.print_exc()


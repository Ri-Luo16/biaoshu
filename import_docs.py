import asyncio
import os
import glob
from pathlib import Path
from backend.app.services.file_service import FileService
from backend.app.services.milvus_service import MilvusService
from langchain_text_splitters import RecursiveCharacterTextSplitter

# 配置要导入的文件夹路径
DOCS_DIR = r"C:\Users\79436\Desktop\yibiao-simple\标书资料"  # 或者是您的标书文件存放路径，例如 "C:/Users/79436/Desktop/标书库"

async def import_documents():
    print(f"开始从 {DOCS_DIR} 导入文档...")
    
    # 1. 获取所有支持的文件
    files = []
    extensions = ['*.pdf', '*.docx', '*.doc']
    for ext in extensions:
        # 递归搜索
        files.extend(glob.glob(os.path.join(DOCS_DIR, '**', ext), recursive=True))
    
    print(f"找到 {len(files)} 个文件。")
    
    milvus_service = MilvusService()
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", "。", "！", "？", " ", ""]
    )

    for i, file_path in enumerate(files):
        try:
            print(f"[{i+1}/{len(files)}] 处理文件: {file_path}")
            
            # 2. 提取文本
            path_obj = Path(file_path)
            text = ""
            
            if path_obj.suffix.lower() == '.pdf':
                text = await FileService.extract_text_from_pdf(path_obj)
            elif path_obj.suffix.lower() in ['.docx', '.doc']:
                text = await FileService.extract_text_from_docx(path_obj)
            
            if not text or len(text.strip()) < 50:
                print(f"  -> 跳过: 提取内容为空或太短")
                continue

            # 3. 切片
            chunks = text_splitter.split_text(text)
            print(f"  -> 切分为 {len(chunks)} 个片段")
            
            # 4. 存入 Milvus
            if chunks:
                await milvus_service.add_documents(
                    texts=chunks,
                    metadatas=[{"source": path_obj.name, "path": str(path_obj)} for _ in chunks]
                )
                print(f"  -> 入库成功")
                
        except Exception as e:
            print(f"  -> 处理失败: {e}")

    print("\n所有文档处理完成！")

if __name__ == "__main__":
    # 确保在项目根目录下运行
    if not os.path.exists("backend"):
        print("错误: 请在项目根目录下运行此脚本 (即包含 backend 文件夹的目录)")
        exit(1)
        
    asyncio.run(import_documents())


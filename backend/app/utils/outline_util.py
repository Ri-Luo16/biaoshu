import random
from typing import Dict, Tuple


def get_random_indexes(max_index: int) -> Tuple[int, int]:
    """从0到max_index范围内随机选择两个不同的索引"""
    if max_index < 2:
        raise ValueError("max_index must be at least 2")
    return tuple(random.sample(range(max_index), 2))


def calculate_nodes_distribution(level1_count: int, important_indexes: Tuple[int, int], total_leaf_nodes: int) -> dict:
    """计算树结构中各节点的分配数量"""
    p_weight, s_weight, n_weight = 1.4, 1.2, 1.0
    total_weight = (level1_count - 2) * n_weight + p_weight + s_weight
    base_l2 = round(total_leaf_nodes / level1_count / 3)
    
    level2_nodes = [base_l2] * level1_count
    level2_nodes[important_indexes[0]] = round(base_l2 * p_weight)
    level2_nodes[important_indexes[1]] = round(base_l2 * s_weight)
    
    rem_leaves, leaf_nodes, leaf_per_l2 = total_leaf_nodes, [0] * level1_count, []
    
    for i in range(level1_count):
        weight = p_weight if i == important_indexes[0] else (s_weight if i == important_indexes[1] else n_weight)
        target = round(total_leaf_nodes * weight / total_weight) if i < level1_count - 1 else rem_leaves
        
        l2_count = level2_nodes[i]
        l_per_l2, extra = target // l2_count, target % l2_count
        leaf_per_l2.append([l_per_l2 + (1 if j < extra else 0) for j in range(l2_count)])
        
        leaf_nodes[i], rem_leaves = target, rem_leaves - target
    
    return {'level2_nodes': level2_nodes, 'leaf_nodes': leaf_nodes, 'leaf_per_level2': leaf_per_l2}


def generate_one_outline_json_by_level1(level1_title: str, level1_index: int, dist: Dict) -> Dict:
    """根据一级标题生成该标题下的完整大纲结构"""
    l2_count = dist['level2_nodes'][level1_index - 1]
    leaf_dist = dist['leaf_per_level2'][level1_index - 1]
    
    return {
        "id": f"{level1_index}",
        "title": level1_title,
        "description": "",
        "children": [{
            "id": f"{level1_index}.{j+1}",
            "title": "",
            "description": "",
            "children": [{"id": f"{level1_index}.{j+1}.{k+1}", "title": "", "description": ""} for k in range(leaf_dist[j])]
        } for j in range(l2_count)]
    }

"""
文件API - 处理输出文件的列表和访问
"""

import os
import json
import mimetypes
from pathlib import Path
from flask import Blueprint, jsonify, send_file, abort, request
from datetime import datetime
import logging

# 创建文件API蓝图
files_bp = Blueprint('files', __name__)
logger = logging.getLogger(__name__)

# 配置输出目录
OUTPUT_DIR = Path(__file__).parent.parent.parent / "output"

def ensure_output_dir():
    """确保输出目录存在"""
    OUTPUT_DIR.mkdir(exist_ok=True)
    return OUTPUT_DIR

def get_file_info(file_path):
    """获取文件信息"""
    try:
        stat = file_path.stat()
        return {
            'name': file_path.name,
            'size': stat.st_size,
            'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
            'type': mimetypes.guess_type(file_path.name)[0] or 'application/octet-stream'
        }
    except Exception as e:
        logger.error(f"获取文件信息失败: {e}")
        return None

@files_bp.route('/api/files/output', methods=['GET'])
def list_output_files():
    """获取输出目录中的文件列表"""
    try:
        output_dir = ensure_output_dir()
        files = []
        
        # 遍历输出目录
        for file_path in output_dir.iterdir():
            if file_path.is_file():
                file_info = get_file_info(file_path)
                if file_info:
                    files.append(file_info)
        
        # 按修改时间排序（最新的在前）
        files.sort(key=lambda x: x['modified'], reverse=True)
        
        return jsonify({
            'success': True,
            'files': files,
            'count': len(files),
            'directory': str(output_dir)
        })
        
    except Exception as e:
        logger.error(f"获取文件列表失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'files': []
        }), 500

@files_bp.route('/api/files/output/<path:filename>', methods=['GET'])
def get_output_file(filename):
    """获取输出目录中的指定文件"""
    try:
        output_dir = ensure_output_dir()
        file_path = output_dir / filename
        
        # 安全检查：确保文件在输出目录内
        if not file_path.resolve().is_relative_to(output_dir.resolve()):
            abort(403, "访问被拒绝")
        
        # 检查文件是否存在
        if not file_path.exists() or not file_path.is_file():
            abort(404, "文件不存在")
        
        # 检查是否是下载请求
        download = request.args.get('download', 'false').lower() == 'true'
        
        # 获取MIME类型
        mimetype = mimetypes.guess_type(filename)[0]
        
        # 设置适当的MIME类型
        if mimetype is None:
            if filename.lower().endswith('.docx'):
                mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            elif filename.lower().endswith('.xlsx'):
                mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            elif filename.lower().endswith('.pptx'):
                mimetype = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            else:
                mimetype = 'application/octet-stream'
        
        # 返回文件
        return send_file(
            file_path,
            mimetype=mimetype,
            as_attachment=download,
            download_name=filename if download else None
        )
        
    except Exception as e:
        logger.error(f"获取文件失败: {e}")
        abort(500, f"服务器错误: {str(e)}")

@files_bp.route('/api/files/output/<path:filename>', methods=['DELETE'])
def delete_output_file(filename):
    """删除输出目录中的指定文件"""
    try:
        output_dir = ensure_output_dir()
        file_path = output_dir / filename
        
        # 安全检查：确保文件在输出目录内
        if not file_path.resolve().is_relative_to(output_dir.resolve()):
            return jsonify({
                'success': False,
                'error': '访问被拒绝'
            }), 403
        
        # 检查文件是否存在
        if not file_path.exists():
            return jsonify({
                'success': False,
                'error': '文件不存在'
            }), 404
        
        # 删除文件
        file_path.unlink()
        
        logger.info(f"文件已删除: {filename}")
        return jsonify({
            'success': True,
            'message': f'文件 {filename} 已删除'
        })
        
    except Exception as e:
        logger.error(f"删除文件失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@files_bp.route('/api/files/output/info/<path:filename>', methods=['GET'])
def get_file_info_api(filename):
    """获取文件的详细信息"""
    try:
        output_dir = ensure_output_dir()
        file_path = output_dir / filename
        
        # 安全检查
        if not file_path.resolve().is_relative_to(output_dir.resolve()):
            return jsonify({
                'success': False,
                'error': '访问被拒绝'
            }), 403
        
        # 检查文件是否存在
        if not file_path.exists():
            return jsonify({
                'success': False,
                'error': '文件不存在'
            }), 404
        
        # 获取文件信息
        file_info = get_file_info(file_path)
        if not file_info:
            return jsonify({
                'success': False,
                'error': '无法获取文件信息'
            }), 500
        
        # 添加额外信息
        file_info.update({
            'path': str(file_path),
            'extension': file_path.suffix.lower(),
            'is_readable': os.access(file_path, os.R_OK),
            'is_writable': os.access(file_path, os.W_OK)
        })
        
        return jsonify({
            'success': True,
            'file': file_info
        })
        
    except Exception as e:
        logger.error(f"获取文件信息失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@files_bp.route('/api/files/output/clean', methods=['POST'])
def clean_output_directory():
    """清空输出目录（保留目录本身）"""
    try:
        output_dir = ensure_output_dir()
        deleted_files = []
        
        # 删除所有文件
        for file_path in output_dir.iterdir():
            if file_path.is_file():
                try:
                    file_path.unlink()
                    deleted_files.append(file_path.name)
                except Exception as e:
                    logger.warning(f"删除文件失败: {file_path.name} - {e}")
        
        logger.info(f"清空输出目录，删除了 {len(deleted_files)} 个文件")
        return jsonify({
            'success': True,
            'message': f'已清空输出目录',
            'deleted_files': deleted_files,
            'count': len(deleted_files)
        })
        
    except Exception as e:
        logger.error(f"清空输出目录失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 错误处理
@files_bp.errorhandler(404)
def file_not_found(error):
    return jsonify({
        'success': False,
        'error': '文件未找到'
    }), 404

@files_bp.errorhandler(403)
def access_denied(error):
    return jsonify({
        'success': False,
        'error': '访问被拒绝'
    }), 403

@files_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': '服务器内部错误'
    }), 500 
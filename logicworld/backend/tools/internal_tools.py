"""
内部系统工具 - HTTP请求工具和数据分析工具
这些工具已集成到系统内部，不再作为外部工具显示
"""

import requests
import pandas as pd
import numpy as np
import json
from typing import Dict, Any, List, Optional
import asyncio
import aiohttp


class HTTPRequestTool:
    """内部HTTP请求工具"""
    
    @staticmethod
    async def make_request(
        url: str,
        method: str = "GET",
        headers: Optional[Dict[str, str]] = None,
        data: Optional[Dict[str, Any]] = None,
        timeout: int = 30
    ) -> Dict[str, Any]:
        """
        执行HTTP请求
        
        Args:
            url: 请求URL
            method: HTTP方法 (GET, POST, PUT, DELETE)
            headers: 请求头
            data: 请求数据
            timeout: 超时时间（秒）
            
        Returns:
            包含响应数据的字典
        """
        if headers is None:
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "MindMap-Internal-Tool/1.0"
            }
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=timeout)) as session:
                async with session.request(
                    method=method.upper(),
                    url=url,
                    headers=headers,
                    json=data if data and method.upper() in ["POST", "PUT"] else None
                ) as response:
                    response_data = {
                        "status_code": response.status,
                        "headers": dict(response.headers),
                        "url": str(response.url),
                        "method": method.upper()
                    }
                    
                    # 尝试解析JSON响应
                    try:
                        response_data["data"] = await response.json()
                    except:
                        response_data["data"] = await response.text()
                    
                    return {
                        "success": True,
                        "response": response_data,
                        "message": f"HTTP {method.upper()} 请求成功"
                    }
                    
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"HTTP请求失败: {str(e)}"
            }
    
    @staticmethod
    def make_sync_request(
        url: str,
        method: str = "GET",
        headers: Optional[Dict[str, str]] = None,
        data: Optional[Dict[str, Any]] = None,
        timeout: int = 30
    ) -> Dict[str, Any]:
        """
        同步HTTP请求（用于非async环境）
        """
        if headers is None:
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "MindMap-Internal-Tool/1.0"
            }
        
        try:
            response = requests.request(
                method=method.upper(),
                url=url,
                headers=headers,
                json=data if data and method.upper() in ["POST", "PUT"] else None,
                timeout=timeout
            )
            
            # 尝试解析JSON响应
            try:
                response_data = response.json()
            except:
                response_data = response.text
            
            return {
                "success": True,
                "response": {
                    "status_code": response.status_code,
                    "headers": dict(response.headers),
                    "url": response.url,
                    "method": method.upper(),
                    "data": response_data
                },
                "message": f"HTTP {method.upper()} 请求成功"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"HTTP请求失败: {str(e)}"
            }


class DataAnalysisTool:
    """内部数据分析工具"""
    
    @staticmethod
    def analyze_data(data: List[Dict[str, Any]], analysis_type: str = "basic") -> Dict[str, Any]:
        """
        执行数据分析
        
        Args:
            data: 待分析的数据（字典列表格式）
            analysis_type: 分析类型 (basic, statistical, visualization)
            
        Returns:
            分析结果
        """
        try:
            if not data:
                return {
                    "success": False,
                    "message": "数据为空，无法进行分析"
                }
            
            # 转换为pandas DataFrame
            df = pd.DataFrame(data)
            
            result = {
                "success": True,
                "data_info": {
                    "total_rows": len(df),
                    "total_columns": len(df.columns),
                    "columns": list(df.columns),
                    "data_types": df.dtypes.to_dict()
                },
                "analysis_type": analysis_type
            }
            
            if analysis_type == "basic":
                result["basic_stats"] = {
                    "shape": df.shape,
                    "memory_usage": df.memory_usage(deep=True).sum(),
                    "null_counts": df.isnull().sum().to_dict(),
                    "unique_counts": df.nunique().to_dict()
                }
                
            elif analysis_type == "statistical":
                # 只对数值列进行统计分析
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                if len(numeric_cols) > 0:
                    result["statistical_analysis"] = df[numeric_cols].describe().to_dict()
                    result["correlation_matrix"] = df[numeric_cols].corr().to_dict()
                else:
                    result["message"] = "没有数值列可进行统计分析"
                    
            elif analysis_type == "visualization":
                result["visualization_data"] = {
                    "column_info": [],
                    "suggested_charts": []
                }
                
                for col in df.columns:
                    col_info = {
                        "name": col,
                        "type": str(df[col].dtype),
                        "unique_values": df[col].nunique(),
                        "null_count": df[col].isnull().sum()
                    }
                    
                    # 建议图表类型
                    if df[col].dtype in ['int64', 'float64']:
                        col_info["suggested_charts"] = ["histogram", "box_plot", "line_chart"]
                    elif df[col].nunique() < 20:
                        col_info["suggested_charts"] = ["bar_chart", "pie_chart"]
                    else:
                        col_info["suggested_charts"] = ["word_cloud", "frequency_chart"]
                    
                    result["visualization_data"]["column_info"].append(col_info)
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"数据分析失败: {str(e)}"
            }
    
    @staticmethod
    def clean_data(data: List[Dict[str, Any]], operations: List[str] = None) -> Dict[str, Any]:
        """
        数据清洗
        
        Args:
            data: 待清洗的数据
            operations: 清洗操作列表 ["remove_nulls", "remove_duplicates", "standardize_types"]
            
        Returns:
            清洗后的数据和报告
        """
        if operations is None:
            operations = ["remove_nulls", "remove_duplicates"]
        
        try:
            df = pd.DataFrame(data)
            original_shape = df.shape
            
            cleaning_report = {
                "original_shape": original_shape,
                "operations_performed": [],
                "removed_rows": 0,
                "removed_columns": 0
            }
            
            if "remove_nulls" in operations:
                before_rows = len(df)
                df = df.dropna()
                removed_rows = before_rows - len(df)
                cleaning_report["operations_performed"].append(f"移除空值行: {removed_rows}行")
                cleaning_report["removed_rows"] += removed_rows
            
            if "remove_duplicates" in operations:
                before_rows = len(df)
                df = df.drop_duplicates()
                removed_rows = before_rows - len(df)
                cleaning_report["operations_performed"].append(f"移除重复行: {removed_rows}行")
                cleaning_report["removed_rows"] += removed_rows
            
            if "standardize_types" in operations:
                # 尝试自动转换数据类型
                for col in df.columns:
                    if df[col].dtype == 'object':
                        # 尝试转换为数值
                        try:
                            df[col] = pd.to_numeric(df[col])
                            cleaning_report["operations_performed"].append(f"转换 {col} 为数值类型")
                        except:
                            pass
            
            return {
                "success": True,
                "cleaned_data": df.to_dict('records'),
                "cleaning_report": cleaning_report,
                "final_shape": df.shape,
                "message": f"数据清洗完成，从 {original_shape} 清洗到 {df.shape}"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"数据清洗失败: {str(e)}"
            }


# 全局工具实例
http_tool = HTTPRequestTool()
data_tool = DataAnalysisTool()


# 注册内部工具到系统（可选）
def register_internal_tools():
    """注册内部工具到系统工具注册表"""
    from .tool_registry import register_tool
    
    # 注册HTTP工具方法
    register_tool(http_tool.make_sync_request)
    register_tool(data_tool.analyze_data)
    register_tool(data_tool.clean_data)
    
    print("内部工具已注册: HTTP请求工具, 数据分析工具")


# 导出工具接口
__all__ = ['HTTPRequestTool', 'DataAnalysisTool', 'http_tool', 'data_tool', 'register_internal_tools'] 
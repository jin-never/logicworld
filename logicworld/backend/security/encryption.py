"""
平台安全模块 - 加密工具
提供API密钥和敏感数据的加密/解密功能

主要功能:
- AES-GCM加密/解密
- Fernet加密/解密
- 密码哈希和验证
- API密钥安全存储
- 密钥轮换机制
"""

import os
import base64
import hashlib
import secrets
from typing import Optional, Tuple, Dict, Any
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import logging

logger = logging.getLogger(__name__)


class EncryptionManager:
    """加密管理器 - 负责所有加密/解密操作"""
    
    def __init__(self, master_key: Optional[str] = None):
        """
        初始化加密管理器
        
        Args:
            master_key: 主密钥，如果不提供则从环境变量获取
        """
        self.master_key = master_key or os.getenv("SECURITY_MASTER_KEY")
        if not self.master_key:
            raise ValueError("未找到主密钥，请设置 SECURITY_MASTER_KEY 环境变量")
        
        self.backend = default_backend()
        self._fernet_cache = {}  # Fernet实例缓存
        
    def generate_key(self, key_type: str = "user") -> str:
        """
        生成新的加密密钥
        
        Args:
            key_type: 密钥类型 (master, user, api)
            
        Returns:
            base64编码的密钥
        """
        if key_type == "fernet":
            return Fernet.generate_key().decode()
        else:
            # 生成256位随机密钥
            return base64.b64encode(secrets.token_bytes(32)).decode()
    
    def derive_key_from_password(self, password: str, salt: bytes) -> bytes:
        """
        从密码派生密钥
        
        Args:
            password: 用户密码
            salt: 盐值
            
        Returns:
            派生的密钥
        """
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=self.backend
        )
        return kdf.derive(password.encode())
    
    def encrypt_with_aes_gcm(self, plaintext: str, key: bytes) -> Tuple[str, str]:
        """
        使用AES-GCM加密数据
        
        Args:
            plaintext: 明文
            key: 加密密钥
            
        Returns:
            (加密后的数据, IV) 的元组，都是base64编码
        """
        # 生成随机IV
        iv = secrets.token_bytes(12)  # GCM推荐12字节IV
        
        # 创建加密器
        cipher = Cipher(
            algorithms.AES(key),
            modes.GCM(iv),
            backend=self.backend
        )
        encryptor = cipher.encryptor()
        
        # 加密数据
        ciphertext = encryptor.update(plaintext.encode()) + encryptor.finalize()
        
        # 获取认证标签
        tag = encryptor.tag
        
        # 组合密文和标签
        encrypted_data = ciphertext + tag
        
        return (
            base64.b64encode(encrypted_data).decode(),
            base64.b64encode(iv).decode()
        )
    
    def decrypt_with_aes_gcm(self, encrypted_data: str, iv: str, key: bytes) -> str:
        """
        使用AES-GCM解密数据
        
        Args:
            encrypted_data: base64编码的加密数据
            iv: base64编码的IV
            key: 解密密钥
            
        Returns:
            解密后的明文
        """
        try:
            # 解码数据
            encrypted_bytes = base64.b64decode(encrypted_data)
            iv_bytes = base64.b64decode(iv)
            
            # 分离密文和认证标签
            ciphertext = encrypted_bytes[:-16]  # 前面是密文
            tag = encrypted_bytes[-16:]         # 后16字节是标签
            
            # 创建解密器
            cipher = Cipher(
                algorithms.AES(key),
                modes.GCM(iv_bytes, tag),
                backend=self.backend
            )
            decryptor = cipher.decryptor()
            
            # 解密数据
            plaintext = decryptor.update(ciphertext) + decryptor.finalize()
            
            return plaintext.decode()
            
        except Exception as e:
            logger.error(f"AES-GCM解密失败: {e}")
            raise ValueError("解密失败，数据可能已损坏或密钥错误")
    
    def encrypt_with_fernet(self, plaintext: str, key: str) -> str:
        """
        使用Fernet加密数据（包含完整性验证）
        
        Args:
            plaintext: 明文
            key: base64编码的Fernet密钥
            
        Returns:
            base64编码的加密数据
        """
        try:
            # 获取或创建Fernet实例
            if key not in self._fernet_cache:
                self._fernet_cache[key] = Fernet(key.encode())
            
            fernet = self._fernet_cache[key]
            encrypted_data = fernet.encrypt(plaintext.encode())
            
            return base64.b64encode(encrypted_data).decode()
            
        except Exception as e:
            logger.error(f"Fernet加密失败: {e}")
            raise ValueError("加密失败")
    
    def decrypt_with_fernet(self, encrypted_data: str, key: str) -> str:
        """
        使用Fernet解密数据
        
        Args:
            encrypted_data: base64编码的加密数据
            key: base64编码的Fernet密钥
            
        Returns:
            解密后的明文
        """
        try:
            # 获取或创建Fernet实例
            if key not in self._fernet_cache:
                self._fernet_cache[key] = Fernet(key.encode())
            
            fernet = self._fernet_cache[key]
            encrypted_bytes = base64.b64decode(encrypted_data)
            plaintext = fernet.decrypt(encrypted_bytes)
            
            return plaintext.decode()
            
        except Exception as e:
            logger.error(f"Fernet解密失败: {e}")
            raise ValueError("解密失败，数据可能已损坏或密钥错误")


class APIKeyManager:
    """API密钥管理器 - 专门处理API密钥的加密存储"""
    
    def __init__(self, encryption_manager: EncryptionManager):
        self.encryption_manager = encryption_manager
    
    def encrypt_api_key(self, api_key: str, user_key: str) -> Dict[str, str]:
        """
        加密API密钥
        
        Args:
            api_key: 原始API密钥
            user_key: 用户专用加密密钥
            
        Returns:
            包含加密数据的字典
        """
        try:
            # 使用用户密钥派生实际加密密钥
            user_key_bytes = base64.b64decode(user_key)
            
            # 使用AES-GCM加密
            encrypted_key, iv = self.encryption_manager.encrypt_with_aes_gcm(
                api_key, user_key_bytes
            )
            
            # 生成密钥哈希用于验证
            key_hash = hashlib.sha256(api_key.encode()).hexdigest()
            
            return {
                "encrypted_api_key": encrypted_key,
                "iv": iv,
                "key_hash": key_hash,
                "algorithm": "AES-256-GCM"
            }
            
        except Exception as e:
            logger.error(f"API密钥加密失败: {e}")
            raise ValueError("API密钥加密失败")
    
    def decrypt_api_key(self, encrypted_data: Dict[str, str], user_key: str) -> str:
        """
        解密API密钥
        
        Args:
            encrypted_data: 加密数据字典
            user_key: 用户专用解密密钥
            
        Returns:
            解密后的API密钥
        """
        try:
            user_key_bytes = base64.b64decode(user_key)
            
            # 解密API密钥
            api_key = self.encryption_manager.decrypt_with_aes_gcm(
                encrypted_data["encrypted_api_key"],
                encrypted_data["iv"],
                user_key_bytes
            )
            
            # 验证密钥完整性
            expected_hash = hashlib.sha256(api_key.encode()).hexdigest()
            if expected_hash != encrypted_data["key_hash"]:
                raise ValueError("密钥完整性验证失败")
            
            return api_key
            
        except Exception as e:
            logger.error(f"API密钥解密失败: {e}")
            raise ValueError("API密钥解密失败")
    
    def rotate_user_key(self, old_key: str, encrypted_api_keys: list) -> Tuple[str, list]:
        """
        轮换用户加密密钥
        
        Args:
            old_key: 旧的用户密钥
            encrypted_api_keys: 使用旧密钥加密的API密钥列表
            
        Returns:
            (新密钥, 使用新密钥重新加密的API密钥列表)
        """
        try:
            # 生成新的用户密钥
            new_key = self.encryption_manager.generate_key("user")
            
            # 重新加密所有API密钥
            re_encrypted_keys = []
            for encrypted_data in encrypted_api_keys:
                # 先用旧密钥解密
                api_key = self.decrypt_api_key(encrypted_data, old_key)
                # 再用新密钥加密
                new_encrypted_data = self.encrypt_api_key(api_key, new_key)
                re_encrypted_keys.append(new_encrypted_data)
            
            return new_key, re_encrypted_keys
            
        except Exception as e:
            logger.error(f"密钥轮换失败: {e}")
            raise ValueError("密钥轮换失败")


class PasswordManager:
    """密码管理器 - 处理用户密码的安全存储"""
    
    @staticmethod
    def generate_salt() -> str:
        """生成随机盐值"""
        return base64.b64encode(secrets.token_bytes(32)).decode()
    
    @staticmethod
    def hash_password(password: str, salt: str) -> str:
        """
        哈希密码
        
        Args:
            password: 原始密码
            salt: 盐值
            
        Returns:
            哈希后的密码
        """
        salt_bytes = base64.b64decode(salt)
        
        # 使用PBKDF2进行密码哈希
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt_bytes,
            iterations=100000,
            backend=default_backend()
        )
        
        password_hash = kdf.derive(password.encode())
        return base64.b64encode(password_hash).decode()
    
    @staticmethod
    def verify_password(password: str, salt: str, stored_hash: str) -> bool:
        """
        验证密码
        
        Args:
            password: 用户输入的密码
            salt: 存储的盐值
            stored_hash: 存储的密码哈希
            
        Returns:
            密码是否正确
        """
        try:
            computed_hash = PasswordManager.hash_password(password, salt)
            return secrets.compare_digest(computed_hash, stored_hash)
        except Exception as e:
            logger.error(f"密码验证失败: {e}")
            return False
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """生成安全令牌"""
        return secrets.token_urlsafe(length)


# 全局加密管理器实例
_encryption_manager = None
_api_key_manager = None

def get_encryption_manager() -> EncryptionManager:
    """获取全局加密管理器实例"""
    global _encryption_manager
    if _encryption_manager is None:
        _encryption_manager = EncryptionManager()
    return _encryption_manager

def get_api_key_manager() -> APIKeyManager:
    """获取全局API密钥管理器实例"""
    global _api_key_manager
    if _api_key_manager is None:
        _api_key_manager = APIKeyManager(get_encryption_manager())
    return _api_key_manager

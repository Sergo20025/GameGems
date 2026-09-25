from setuptools import setup, find_packages

setup(
    name="backend",           # здесь можно поставить любое удобное имя
    version="0.1",
    packages=find_packages(where="backend"),
    package_dir={"": "backend"},
)
---
name: review
description: 审查指定代码中的逻辑错误和遗漏的边界情况，报告实质问题。
when_to_use: 用户要求代码审查、检查代码逻辑或查找潜在缺陷时使用。
user-invocable: true
context: inline
---

阅读用户指定的代码，检查逻辑错误和遗漏的边界情况。

只报告实质问题，标明位置、原因和影响。

不要修改代码；没有发现问题就明确说明。

本次审查任务：
$ARGUMENTS

# Agent Notes

这里只放一种文档：记录影响本项目的决策——"为什么"和"放弃了什么"。

## 路径 = 元数据

`.agents/notes/{lifecycle}/{class}/yyyy-mm-dd-topic.md`

- proposed/ 未落地提案；implemented/ 已落地且随代码更新事实；rejected/ 已否决；archived/ 冻结决策正文，允许修复链接和路径元数据。
- class: architecture（源码/站点结构）/ process（流程工具）/ testing / misc。新增类别需改本文件。
- 日期 = 首次提出日。文件间引用一律相对链接。

## 何时写

只为持久决策理由写；机械性修改豁免；已有 note 拥有该决策就更新它，禁止重复建。

每次 git commit 之后过一遍这张表（结合本轮用户纠正与实际变更，不仅凭提交标题），命中才写，全部未命中静默继续；同一问题在另一入口再次出现或用户指出遗漏时，不能用"改动小"跳过。提交前已命中的先落盘并随代码提交；提交后才发现遗漏则补到工作区，不自动 amend 或新增提交：

| 发生了什么 | 写什么 | 写到哪 |
|---|---|---|
| 拍板了一个有取舍的技术决策（选库、定架构、定协议、定目录） | 决策 note | `implemented/{class}/yyyy-mm-dd-主题.md` |
| 大改动动手前需要论证方案 | 提案 note | `proposed/...` |
| 方案讨论后被否决 | 原提案移入 rejected，Status 改 rejected 并附否决理由，修复相对链接 | `rejected/...` |
| 同一个坑踩了第二次 / 同类问题被问了第二遍 | 1~3 行祈使句规则 + 理由链接 | 根 [AGENTS.md](../../AGENTS.md) |
| 一套流程执行了第二遍（发布、排障、部署、review） | 工作流 skill | `.agents/skills/{kebab-case-name}/SKILL.md` |
| 代码挪了 / 改名 / 改默认值 | 同一提交里更新受影响 note 的事实部分 | 相应 note |
| 某条规则被证明错了 | 写新 note 反转 + 新旧互相链接 | notes + AGENTS.md |
| note 只剩历史价值 | 归档或删除，修复所有入链 | `archived/` 或删除 |

## 记录格式

决策 note（implemented）必需章节：

```markdown
# Agent Note: <标题>

Status: implemented

## Problem
<当时的矛盾/约束>

## Decision
<已落地的事实，现在时，链接关键代码路径>

## Alternatives considered
**<方案A>。** <为什么输>
**<方案B>。** <为什么输>

## Consequences
<代价与收益>
```

proposed 版骨架：`Problem / Proposal / Alternatives considered / Acceptance criteria / Risks`。禁止 should 式规格腔，只写已发生的事实。

## 维护

迁移文件时同步 Status 与相对链接。删除前检查入链与 Git 跟踪状态，未提交的唯一记录优先保留或归档。新增项目工作流时在此或根指南提供链接。

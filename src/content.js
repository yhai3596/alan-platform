// 站点文案键值层：注册表定义每个可编辑块（key/分组/标签/类型/默认值）。
// 默认值即设计稿文案——site_content 无记录时站点与原样完全一致；后台改哪条哪条生效。
const { db } = require('./db');

const T = 'text';
const TA = 'textarea';
const IMG = 'image';

const REGISTRY = [
  // —— 身份（GEO 实体口径）：全站标题/导航/页脚/meta/结构化数据共用这一组，改这里全站同步 ——
  // 对外身份必须一字不差地统一（AI 搜索靠「名字+身份」多处一致来识别同一个人），不要在别处另写一套。
  // 身份较宽（制造业），一句话介绍里保留「暖通」作为细分领域锚点，用于和同名者区分。
  { key: 'id.name', group: '身份（GEO）', label: '对外名字', type: T, def: 'Alan' },
  { key: 'id.title', group: '身份（GEO）', label: '标准身份（全站统一，一字不差）', type: T, def: '制造业AI应用专家' },
  { key: 'id.title_en', group: '身份（GEO）', label: '英文身份', type: T, def: 'Manufacturing AI Application Specialist' },
  { key: 'id.oneliner', group: '身份（GEO）', label: '一句话介绍（默认 meta 描述 / 结构化数据）', type: TA, def: 'Alan，制造业AI应用专家，20 多年制造业从业经验，深耕暖通（HVAC）行业，帮助制造企业把 AI 用进业务流程：企业 AI 诊断、落地咨询、内训，以及 HVAC 选型、AHRI 竞品分析等在线工具和企业 AI 落地产品。' },
  { key: 'id.knows_about', group: '身份（GEO）', label: '专长领域（每行一个）', type: TA, def: '暖通空调（HVAC）\n制造业 AI 落地\n企业 AI 诊断\nAHRI 竞品分析\n专利 AI 辅助' },
  { key: 'id.same_as', group: '身份（GEO）', label: '其他平台主页链接（每行一个完整 URL：公众号/知乎/头条/抖音/LinkedIn 等）', type: TA, def: '' },

  // —— SEO 收录 ——
  { key: 'seo.verify_meta', group: 'SEO 收录', label: '站点验证标签（每行一条：直接粘贴平台给的 <meta> 标签，或写成「名称=验证码」）', type: TA, def: '' },

  // —— 全站 ——
  { key: 'site.portrait', group: '全站', label: '人物照片（首页/关于/文章头像共用）', type: IMG, def: '/assets/alan.png' },

  // —— 首页（v2.0：按 DemoWall/DESIGN.md 改版；数字类内容只写可核查的事实）——
  { key: 'home.hero_eyebrow', group: '首页', label: '首屏 · 眉标', type: T, def: '20 年制造业 · 亲手做 AI' },
  { key: 'home.hero_title', group: '首页', label: '首屏 · 主标题（换行分行）', type: TA, def: '懂工厂的人，\n把 AI 落进业务' },
  { key: 'home.hero_body', group: '首页', label: '首屏 · 介绍（后面自动接「N 个 AI 落地项目正在企业里用着」）', type: TA, def: '美的 20 年，干过研发、制造、营销，现任家电企业副总经理。' },
  { key: 'home.cta_primary', group: '首页', label: '首屏 · 主按钮', type: T, def: '聊聊你的场景' },
  { key: 'home.cta_secondary', group: '首页', label: '首屏 · 次按钮', type: T, def: '看落地案例' },
  { key: 'home.live_caption', group: '首页', label: '首屏 · 「正在运行」卡片副文', type: T, def: '企业在用 · 佛山某家电企业' },
  { key: 'home.trust1_value', group: '首页', label: '信任条 1 · 值', type: T, def: '20 年' },
  { key: 'home.trust1_label', group: '首页', label: '信任条 1 · 说明', type: T, def: '美的研发 · 制造 · 营销' },
  { key: 'home.trust3_value', group: '首页', label: '信任条 3 · 值', type: T, def: '高级' },
  { key: 'home.trust3_label', group: '首页', label: '信任条 3 · 说明', type: T, def: '工信部 AIGC 应用工程师' },
  { key: 'home.trust4_value', group: '首页', label: '信任条 4 · 值', type: T, def: '《FDE 实战》' },
  { key: 'home.trust4_label', group: '首页', label: '信任条 4 · 说明', type: T, def: '合著 · 待出版' },
  { key: 'home.trust5_value', group: '首页', label: '信任条 5 · 值', type: T, def: '北滘 AI 夜校' },
  { key: 'home.trust5_label', group: '首页', label: '信任条 5 · 说明', type: T, def: '发起人' },
  { key: 'home.cases_title', group: '首页', label: '落地案例 · 标题', type: T, def: '这些问题，我处理过' },
  { key: 'home.cases_body', group: '首页', label: '落地案例 · 说明', type: TA, def: '每个案例都讲清楚：原来的问题、做了什么、现在怎样。客户名按行业匿名。' },
  { key: 'home.tools_title', group: '首页', label: '在线可试 · 标题', type: T, def: '点开就能用' },
  { key: 'home.tools_body', group: '首页', label: '在线可试 · 说明', type: TA, def: '已经上线的工具，演示数据是合成的。涉及企业数据的系统不对外开放，在案例里用图文说明。' },
  { key: 'home.method_title', group: '首页', label: '怎么做 · 标题', type: T, def: '先判断值不值得做，再动手' },
  { key: 'home.method_body', group: '首页', label: '怎么做 · 说明', type: TA, def: '不卖课包，不堆概念。每一步都有能拿在手里的产出。' },
  { key: 'home.step1_title', group: '首页', label: '步骤 1 · 标题', type: T, def: '需求诊断' },
  { key: 'home.step1_body', group: '首页', label: '步骤 1 · 说明', type: TA, def: '访谈一线，用六维场景评分排出先做哪个、不做哪个。' },
  { key: 'home.step2_title', group: '首页', label: '步骤 2 · 标题', type: T, def: '方案设计' },
  { key: 'home.step2_body', group: '首页', label: '步骤 2 · 说明', type: TA, def: '数据从哪来、谁来用、怎么算做成——落成一页纸。' },
  { key: 'home.step3_title', group: '首页', label: '步骤 3 · 标题', type: T, def: 'MVP 验证' },
  { key: 'home.step3_body', group: '首页', label: '步骤 3 · 说明', type: TA, def: '2–4 周做出能用的最小版本，用真数据验收。' },
  { key: 'home.step4_title', group: '首页', label: '步骤 4 · 标题', type: T, def: '交付优化' },
  { key: 'home.step4_body', group: '首页', label: '步骤 4 · 说明', type: TA, def: '陪跑上线，教会团队自己维护和迭代。' },
  { key: 'home.service_title', group: '首页', label: '合作方式 · 标题', type: T, def: '从一次诊断开始' },
  { key: 'home.svc1_title', group: '首页', label: '合作 1 · 名称', type: T, def: '场景诊断' },
  { key: 'home.svc1_body', group: '首页', label: '合作 1 · 说明', type: TA, def: '半天到一天，梳理业务痛点，给出 AI 场景优先级和落地路线。也可以先做在线问卷。' },
  { key: 'home.svc2_title', group: '首页', label: '合作 2 · 名称', type: T, def: '企业内训' },
  { key: 'home.svc2_body', group: '首页', label: '合作 2 · 说明', type: TA, def: 'AI 办公提效、智能体实战、知识库搭建、GEO 品牌营销等，按岗位定制。' },
  { key: 'home.svc3_title', group: '首页', label: '合作 3 · 名称', type: T, def: '陪跑交付（FDE）' },
  { key: 'home.svc3_body', group: '首页', label: '合作 3 · 说明', type: TA, def: '驻场或远程，和业务团队一起把系统做出来、用起来。' },
  { key: 'home.svc4_title', group: '首页', label: '合作 4 · 名称', type: T, def: 'POC 验证' },
  { key: 'home.svc4_body', group: '首页', label: '合作 4 · 说明', type: TA, def: '拿一个具体问题做概念验证，用结果决定要不要继续投入。' },
  { key: 'home.photos_title', group: '首页', label: '授课现场 · 标题', type: T, def: '讲过的课，都在现场' },
  { key: 'home.photos_body', group: '首页', label: '授课现场 · 说明', type: TA, def: '企业内训、政府与协会培训、社群工作坊。' },
  { key: 'home.photo1', group: '首页', label: '授课照片 1', type: IMG, def: '/assets/v2/training-1.jpg' },
  { key: 'home.photo1_cap', group: '首页', label: '授课照片 1 · 说明', type: T, def: '某镇党委 · 企业家 AI 培训' },
  { key: 'home.photo2', group: '首页', label: '授课照片 2', type: IMG, def: '/assets/v2/training-2.jpg' },
  { key: 'home.photo2_cap', group: '首页', label: '授课照片 2 · 说明', type: T, def: '企业分享' },
  { key: 'home.photo3', group: '首页', label: '授课照片 3', type: IMG, def: '/assets/v2/training-3.jpg' },
  { key: 'home.photo3_cap', group: '首页', label: '授课照片 3 · 说明', type: T, def: '线下 AI 培训' },
  { key: 'home.photo4', group: '首页', label: '授课照片 4', type: IMG, def: '/assets/v2/training-4.jpg' },
  { key: 'home.photo4_cap', group: '首页', label: '授课照片 4 · 说明', type: T, def: 'AI 工作坊' },
  { key: 'home.photo5', group: '首页', label: '授课照片 5', type: IMG, def: '/assets/v2/training-5.jpg' },
  { key: 'home.photo5_cap', group: '首页', label: '授课照片 5 · 说明', type: T, def: '中南大学校友会' },
  { key: 'home.pledge_title', group: '首页', label: '数据承诺 · 标题', type: T, def: '先定规矩，再碰数据' },
  { key: 'home.pledge_body', group: '首页', label: '数据承诺 · 说明', type: TA, def: '这是我自己项目里一直在执行的做法，不是合同条款。' },
  { key: 'home.pledge1_title', group: '首页', label: '承诺 1 · 标题', type: T, def: '先分级，再决定能不能上云' },
  { key: 'home.pledge1_body', group: '首页', label: '承诺 1 · 说明', type: TA, def: '客户信息、工单原文、设备序列号，一律不进任何云端模型。' },
  { key: 'home.pledge2_title', group: '首页', label: '承诺 2 · 标题', type: T, def: '本地优先' },
  { key: 'home.pledge2_body', group: '首页', label: '承诺 2 · 说明', type: TA, def: '敏感数据的处理放在你自己的电脑或服务器上，云端只拿脱敏后的统计。' },
  { key: 'home.pledge3_title', group: '首页', label: '承诺 3 · 标题', type: T, def: '发布前过闸门' },
  { key: 'home.pledge3_body', group: '首页', label: '承诺 3 · 说明', type: TA, def: '任何对外材料先跑敏感信息扫描，命中就拦下。' },
  { key: 'home.pledge4_title', group: '首页', label: '承诺 4 · 标题', type: T, def: '不复用你的数据' },
  { key: 'home.pledge4_body', group: '首页', label: '承诺 4 · 说明', type: TA, def: '案例对外一律匿名到行业，经你同意才写名字。' },
  { key: 'home.about_title', group: '首页', label: '关于 · 标题（换行分行）', type: TA, def: '研发、制造、营销都干过，\n现在亲手做 AI' },
  { key: 'home.about_body', group: '首页', label: '关于 · 介绍', type: TA, def: '2003 年进美的做研发，之后管过工厂、做过北美市场，2022 年起任家电企业副总经理，分管制造、品质和供应链。AI 破局企培中心佛山区域负责人，北滘 AI 夜校发起人。' },
  { key: 'home.contact_title', group: '首页', label: '联系 · 标题', type: T, def: '说说你的场景' },
  { key: 'home.contact_body', group: '首页', label: '联系 · 介绍', type: TA, def: '扫码关注公众号「Alan 的 AI 世界」，留言你的行业和想解决的问题；想试用专利交底系统，留言「试用」获取账号。也可以留下邮箱，我会回复。' },
  { key: 'site.qr_mp', group: '全站', label: '公众号二维码', type: IMG, def: '/assets/v2/qr-mp.jpg' },
  { key: 'site.brand', group: '全站', label: '导航品牌名', type: T, def: 'Alan 的 AI 世界' },
  { key: 'site.brand_sub', group: '全站', label: '导航品牌副标', type: T, def: '企业 AI 落地' },
  { key: 'site.ip_url', group: '全站', label: '个人主页（IP 站）地址', type: T, def: 'https://ip.geopro.cc' },

  // —— 关于 ——
  { key: 'about.subtitle', group: '关于', label: '身份说明', type: T, def: 'AI 企业落地顾问 · 美的 20 年研发、制造、营销 · 现任家电企业副总经理' },
  { key: 'about.bio', group: '关于', label: '个人自述', type: TA, def: '在美的干了 20 年：研发 8 年、生产制造 5 年、海外营销 5 年、国内营销 2 年。2022 年起任一家北美高端空调品牌的副总经理，分管制造、品质和供应链，并负责企业的 AI 数字化转型。我相信 AI 的价值不在演示里，而在流程里——在评审会、产线工位、售后工单和报价单里。' },
  { key: 'about.bio_en', group: '关于', label: '英文注脚', type: T, def: '20 years at a Fortune Global 500 manufacturer. Now putting AI to real work in factories.' },
  { key: 'about.contact_email', group: '关于', label: '联系 · 邮箱', type: T, def: 'hello@alan-ai.example' },
  { key: 'about.contact_wechat', group: '关于', label: '联系 · 微信', type: T, def: 'alan_hvac_ai（占位）' },
  { key: 'about.contact_linkedin', group: '关于', label: '联系 · LinkedIn', type: T, def: '/in/alan-hvac-ai（占位）' },
  { key: 'about.contact_mp', group: '关于', label: '联系 · 公众号', type: T, def: 'Alan 的 AI 世界' },
  { key: 'about.timeline', group: '关于', label: '经历时间线（每行：时间｜单位·岗位｜说明）', type: TA, def: '2003–2010｜美的 · 中央空调研发｜结构工程师 → 项目经理 → 结构组组长。做南美美式风管机，负责首代北美产品与认证。\n2010–2015｜美的 · 生产制造｜顺德工厂工程部负责人，后外派合肥工厂全面负责工程部。推行单元式作业和价值流拉动。\n2015–2020｜美的 · 海外营销｜产品企划、北美大区技术支持负责人、全球产品企划。\n2020–2022｜美的 · 国内营销｜技术支持模块负责人，搭建内销培训体系。\n2022–今｜北美高端空调品牌 · 副总经理｜从代工转自主制造，品质体系从零搭建；分管制造、品质、供应链和 AI 数字化转型。\n2023–今｜AI 实践与企业服务｜AI 破局俱乐部行动家、企培中心佛山区域负责人，发起北滘 AI 夜校，为企业、协会、党校做 AI 培训。' },
  { key: 'about.credentials', group: '关于', label: '资质与身份（每行：名称｜说明）', type: TA, def: '工信部 AIGC 应用工程师｜高级\n深圳人工智能专委会｜会员\nAI 破局企培中心｜佛山区域负责人\n北滘 AI 夜校｜发起人\n中南大学 · 南京大学｜机电一体化 · MBA' },
  { key: 'about.courses', group: '关于', label: '主讲课程（每行：课程｜一句话）', type: TA, def: 'AI 企业赋能｜管理层视角：AI 能干什么、先干什么、怎么验收\nAI 办公提效 / 职场 AI 工具实战｜文档、表格、会议、写作，当场用起来\nAI 智能体应用及实战｜WorkBuddy、OpenClaw 等平台的企业落地\n企业 / 个人知识库 AI 化搭建｜让 AI 读懂你公司的资料\nGEO 品牌营销 · 数字人与 IP｜让品牌内容被 AI 引用，打造个人 IP\n定制化培训｜销售、行政、管理层等场景定制' },
  { key: 'about.book_title', group: '关于', label: '著作 · 书名', type: T, def: '《FDE 实战：技术、方法与行业落地》' },
  { key: 'about.book_body', group: '关于', label: '著作 · 说明', type: TA, def: '合著，负责制造业落地章节：一家家电企业用售后运行数据做故障预警的工程实录。待出版。' },
  { key: 'about.msg_title', group: '关于', label: '留言区 · 标题', type: T, def: '留言给我' },
  { key: 'about.msg_body', group: '关于', label: '留言区 · 说明', type: TA, def: '企业合作、课程咨询、工具反馈，或任何想聊的话题。' },

  // —— 企业AI服务 ——
  { key: 'services.hero_title', group: '企业AI服务', label: 'Hero 标题（换行分行）', type: TA, def: 'AI 不该停在演示里，\n它该进你的业务流程。' },
  { key: 'services.hero_body', group: '企业AI服务', label: 'Hero 介绍', type: TA, def: '我帮制造业企业回答三个问题：现在在哪里、AI 能接在哪里、下一步怎么走。从一份免费的 AI 诊断报告开始。' },
  { key: 'services.step1_title', group: '企业AI服务', label: '三步 · 1 标题', type: T, def: '填写问卷' },
  { key: 'services.step1_body', group: '企业AI服务', label: '三步 · 1 说明', type: TA, def: '约 10 分钟，围绕业务现状、数据基础、团队能力与目标的一组问题。不需要任何技术背景。' },
  { key: 'services.step2_title', group: '企业AI服务', label: '三步 · 2 标题', type: T, def: 'AI 生成诊断报告' },
  { key: 'services.step2_body', group: '企业AI服务', label: '三步 · 2 说明', type: TA, def: '报告包含：AI 成熟度评估、业务中的 AI 结合点清单、按优先级排列的推进路径。' },
  { key: 'services.step3_title', group: '企业AI服务', label: '三步 · 3 标题', type: T, def: '一对一解读' },
  { key: 'services.step3_body', group: '企业AI服务', label: '三步 · 3 说明', type: TA, def: '预约一次解读沟通，把报告翻译成你企业里可以立刻启动的第一步。' },
  { key: 'services.svc1_title', group: '企业AI服务', label: '服务1 · 名称', type: T, def: 'AI 现状诊断' },
  { key: 'services.svc1_desc', group: '企业AI服务', label: '服务1 · 说明', type: TA, def: '问卷 + AI 生成报告 + 解读沟通，评估企业 AI 成熟度与切入点。' },
  { key: 'services.svc2_title', group: '企业AI服务', label: '服务2 · 名称', type: T, def: 'AI 落地咨询' },
  { key: 'services.svc2_desc', group: '企业AI服务', label: '服务2 · 说明', type: TA, def: '结合点识别、方案设计、供应商与工具选型，陪企业走完从 0 到 1。' },
  { key: 'services.svc3_title', group: '企业AI服务', label: '服务3 · 名称', type: T, def: '企业内训' },
  { key: 'services.svc3_desc', group: '企业AI服务', label: '服务3 · 说明', type: TA, def: '面向管理层与业务团队的 AI 应用工作坊，以企业自己的业务为案例。' },

  // —— 案例·培训 ——
  { key: 'cases.hero_title', group: '案例培训', label: 'Hero 标题（换行分行）', type: TA, def: '做过的事，\n比说过的话更可信。' },
  { key: 'cases.hero_body', group: '案例培训', label: 'Hero 介绍', type: TA, def: '企业 AI 落地项目与培训现场的记录。案例细节经客户同意后公开，部分做了脱敏处理。' },
  { key: 'cases.training1_img', group: '案例培训', label: '培训照片 1', type: IMG, def: '' },
  { key: 'cases.training1_caption', group: '案例培训', label: '培训照片 1 · 说明', type: T, def: '企业 AI 应用工作坊 · 2026.05' },
  { key: 'cases.training2_img', group: '案例培训', label: '培训照片 2', type: IMG, def: '' },
  { key: 'cases.training2_caption', group: '案例培训', label: '培训照片 2 · 说明', type: T, def: '管理层 AI 认知课 · 2026.04' },
  { key: 'cases.training3_img', group: '案例培训', label: '培训照片 3', type: IMG, def: '' },
  { key: 'cases.training3_caption', group: '案例培训', label: '培训照片 3 · 说明', type: T, def: '行业协会分享 · 2026.03' },
  { key: 'cases.stat1_value', group: '案例培训', label: '数字1 · 值', type: T, def: '30+' },
  { key: 'cases.stat1_label', group: '案例培训', label: '数字1 · 说明', type: T, def: '场企业培训与分享' },
  { key: 'cases.stat2_value', group: '案例培训', label: '数字2 · 值', type: T, def: '1,200+' },
  { key: 'cases.stat2_label', group: '案例培训', label: '数字2 · 说明', type: T, def: '参训学员' },
  { key: 'cases.stat3_value', group: '案例培训', label: '数字3 · 值', type: T, def: '4.8' },
  { key: 'cases.stat3_label', group: '案例培训', label: '数字3 · 说明', type: T, def: '平均满意度 / 5' },

  // —— 课程 / 工具 / 博客 / 诊断 ——
  { key: 'courses.hero_title', group: '课程', label: 'Hero 标题（换行分行）', type: TA, def: '不讲概念，\n讲怎么把 AI 用起来。' },
  { key: 'courses.hero_body', group: '课程', label: 'Hero 介绍', type: TA, def: '面向制造业与暖通行业从业者的实战课程。注册登录后可购买与学习。' },
  { key: 'tools.hero_title', group: '工具集', label: 'Hero 标题（换行分行）', type: TA, def: '为暖通行业打造的\nAI 工具台。' },
  { key: 'tools.hero_body', group: '工具集', label: 'Hero 介绍', type: TA, def: '每一件工具都来自真实的工作场景。注册登录后即可在线使用；工具会持续增加。' },
  { key: 'tools.more_title', group: '工具集', label: '"更多工具"卡片标题', type: T, def: '更多工具正在路上' },
  { key: 'blog.hero_title', group: '博客', label: 'Hero 标题', type: T, def: '行业观察与工作笔记。' },
  { key: 'blog.subscribe_note', group: '博客', label: '订阅卡说明', type: TA, def: '新文章与工具上新，直接进你的邮箱。不发广告。' },
  { key: 'blog.writing_note', group: '博客', label: '"写作方式"说明', type: TA, def: '文章由我本人撰写，AI 工具辅助整理与配图。观点是我的，错误也是。' },
  { key: 'diagnosis.note', group: '诊断', label: '页头说明（邮件未配置时自动追加回访措辞）', type: T, def: '约 10 分钟 · 完成后由 Hermes Agent 生成诊断报告' },
];

const byKey = new Map(REGISTRY.map(r => [r.key, r]));
const stGet = db.prepare('SELECT value FROM site_content WHERE key=?');
const stSet = db.prepare("INSERT INTO site_content(key,value,updated_at) VALUES(?,?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at");
const stDel = db.prepare('DELETE FROM site_content WHERE key=?');

function raw(key) {
  const row = stGet.get(key);
  if (row && row.value !== '') return row.value;
  const def = byKey.get(key);
  return def ? def.def : '';
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
// 模板助手：ct=转义文本 ctBr=转义+换行转<br> ctImg=图片路径（仅站内路径）
const ct = key => esc(raw(key));
const ctBr = key => esc(raw(key)).replace(/\r?\n/g, '<br>');
function ctImg(key) {
  const v = raw(key);
  return /^\/(uploads|assets)\/[\w\-./]+$/.test(v) ? v : '';
}

// 设计稿占位值（如联系方式「（占位）」、example 域名邮箱）：前台不展示，避免假信息被搜索与 AI 抓取
const isPlaceholder = v => !v || /占位|\.example\b|example\.(com|org)/i.test(String(v));
// 多行文本 → 去空行数组
const lines = key => raw(key).split(/\r?\n/).map(s => s.trim()).filter(Boolean);

function listForAdmin() {
  return REGISTRY.map(r => {
    const row = stGet.get(r.key);
    return { key: r.key, group: r.group, label: r.label, type: r.type, def: r.def, value: row ? row.value : '', overridden: !!row };
  });
}
function save(key, value) {
  if (!byKey.has(key)) throw new Error(`未知内容键：${key}`);
  const v = String(value);
  if (v.includes('�')) throw new Error('内容包含无效字符（编码损坏），已拒绝保存'); // 防脏字节入库
  if (v === '' || v === byKey.get(key).def) stDel.run(key); // 清空/等于默认 = 撤销覆盖
  else stSet.run(key, v);
}

module.exports = { REGISTRY, raw, ct, ctBr, ctImg, isPlaceholder, lines, listForAdmin, save };

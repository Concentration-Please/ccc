import type { GovernmentAidDataset } from '@/types/governmentAid'

const LIST_SOURCE =
  'https://www.ipc.gov.taipei/Content_List.aspx?n=082798040B8AF70C'

export const mockGovernmentAidDataset: GovernmentAidDataset = {
  source: LIST_SOURCE,
  generated_at: '2026-11-07T08:41:03.363Z',
  updated_at: '2026-11-07T16:41:03.363+08:00',
  complete: true,
  records: [
    {
      category: '托育服務',
      is_organization: false,
      registration_months: null,
      source_url:
        'https://www.ipc.gov.taipei/News_Content.aspx?n=F2D7E9CA53A442A8&sms=E939F40E49EF42B3&s=1FA2513A06452692',
      name: '115學年第1學期托育補助',
      summary:
        '提供具有原住民身分且符合收入與居住條件之兒童，於本市托育機構就托之補助。',
      subsidy_target: '依據臺北市原住民托育及協力照顧補助要點第5點辦理',
      conditions: [
        '具有原住民身分之國民小學以下兒童',
        '兒童及父母一方須設籍並實際居住本市',
        '家庭總收入平均分配全家人口，每人每月未達本市115年度最低生活費標準之二倍者(41,488元以下)',
        '實際就托於本市居家式托育服務人員(保母)、托育家園或托嬰中心、公、私立幼兒園、準公共幼兒園、非營利幼兒園及兒童課後照顧服務中心',
        '符合本府或其他政府同性質之補助者，應優先申請該項補助',
        '前項優先申請之補助核准金額未達本補助之最高額度者，得申請補助差額',
      ],
    },
    {
      category: '就學補助',
      is_organization: false,
      registration_months: 6,
      source_url:
        'https://www.ipc.gov.taipei/News_Content.aspx?n=F2D7E9CA53A442A8&sms=E939F40E49EF42B3&s=2B8C4E1A0912D530',
      name: '原住民學生就學生活補助',
      summary:
        '補助設籍並實際居住本市之原住民學生就學所需之生活及書籍費用，減輕家庭教育負擔。',
      subsidy_target: '臺北市原住民學生就學獎勵及生活補助要點所定各級學校學生',
      conditions: [
        '具有依法認定之原住民身分',
        '申請人設籍本市且實際居住達6個月以上',
        '就讀本市公私立國小、國中、高中（職）或經核准之特殊教育學校',
        '學期在校成績、出勤情形符合要點規定',
        '未同時領取中央或他縣市同性質全額補助',
      ],
    },
    {
      category: '生活津貼',
      is_organization: false,
      registration_months: 12,
      source_url:
        'https://www.ipc.gov.taipei/News_Content.aspx?n=F2D7E9CA53A442A8&sms=E939F40E49EF42B3&s=3C9D5F2B1A234641',
      name: '原住民長者生活關懷津貼',
      summary:
        '針對經濟條件較為弱勢之原住民長者，提供每月生活津貼及關懷訪視服務轉介。',
      subsidy_target: '設籍本市滿1年、年滿65歲之原住民長者',
      conditions: [
        '具有原住民身分且年滿65歲',
        '設籍本市連續滿12個月並實際居住',
        '個人月均收入及動產符合要點所定低收入戶認定標準',
        '未入住公費安置機構或已依規定扣除安置相關費用',
        '同一申請人不得重複請領本市同性質津貼',
      ],
    },
    {
      category: '醫療補助',
      is_organization: false,
      registration_months: null,
      source_url:
        'https://www.ipc.gov.taipei/News_Content.aspx?n=F2D7E9CA53A442A8&sms=E939F40E49EF42B3&s=4D0E6G3C2B345752',
      name: '原住民急難醫療補助',
      summary:
        '協助突發重大疾病或意外事故之原住民族眾，補助健保不給付或部分負擔之醫療費用。',
      subsidy_target: '設籍本市之原住民及同一戶籍之直系亲属',
      conditions: [
        '申請人或其補助對象具有原住民身分',
        '設籍並實際居住本市',
        '因急病、意外或重大傷病致家庭生活陷於困難',
        '持有醫療院所開立之診斷、費用單據及相關證明',
        '已先向健保署、社會局或其他機關申請補助者，僅得就差額申請',
      ],
    },
    {
      category: '就業輔導',
      is_organization: false,
      registration_months: 3,
      source_url:
        'https://www.ipc.gov.taipei/News_Content.aspx?n=F2D7E9CA53A442A8&sms=E939F40E49EF42B3&s=5E1F7H4D3C456863',
      name: '原住民青年就業培力計畫',
      summary:
        '提供職前訓練、媒合就業及穩定就業獎勵金，協助青年原住民順利進入職場。',
      subsidy_target: '設籍本市、年滿15歲至未滿30歲之原住民',
      conditions: [
        '具有原住民身分，設籍本市且實際居住滿3個月',
        '非現職全職工作者或未曾參加本年同類培訓',
        '完成本府或委託單位辦理之培訓時數',
        '於指定期間內受雇於本市依法登記之企業',
        '就業獎勵金依實際在職月數及要點基準核發',
      ],
    },
    {
      category: '文化傳承',
      is_organization: true,
      registration_months: 6,
      source_url:
        'https://www.ipc.gov.taipei/News_Content.aspx?n=F2D7E9CA53A442A8&sms=E939F40E49EF42B3&s=6F2G8I5E4D567974',
      name: '原住民族文化推廣補助',
      summary:
        '補助立案之原住民團體辦理語言、工藝、祭儀等文化體驗與推廣活動。',
      subsidy_target: '依法立案且以原住民事務為宗旨之社團、協會或文化工作室',
      conditions: [
        '申請單位須為本市立案之原住民人民團體或文化推廣組織',
        '登記地或主要活動地點在本市，負責人具原住民身分',
        '活動內容須具文化傳承或語言復振之性質',
        '提出完整計畫書、預算及成果報告格式',
        '同一單位同一年度申請案件數量依要點上限辦理',
      ],
    },
    {
      category: '住房協助',
      is_organization: false,
      registration_months: 24,
      source_url:
        'https://www.ipc.gov.taipei/News_Content.aspx?n=F2D7E9CA53A442A8&sms=E939F40E49EF42B3&s=7G3H9J6F5E678085',
      name: '原住民租屋補助',
      summary:
        '補助在本市租用住宅之原住民戶，減輕租金負擔，並優先媒合合法租賃物件。',
      subsidy_target: '設籍本市滿2年、實際租屋居住之原住民家庭',
      conditions: [
        '申請人及配偶或未成年子女具原住民身分',
        '全戶設籍本市連續滿24個月',
        '租賃契約須經租賃住宅媒合或公證，租賃標的位於本市',
        '家庭每月租金支出逾所得財產標準之一定比率',
        '未享有公營住宅、社會住宅或其他租金全額補貼',
      ],
    },
    {
      category: '創業輔導',
      is_organization: true,
      registration_months: 12,
      source_url:
        'https://www.ipc.gov.taipei/News_Content.aspx?n=F2D7E9CA53A442A8&sms=E939F40E49EF42B3&s=8H4I0K7G6F789196',
      name: '原住民微型創業啟動金',
      summary:
        '提供小型創業貸款利息補貼及啟動獎勵，鼓勵原住民於本市創立具文化特色之微企業。',
      subsidy_target: '設籍本市之原住民個人或原住民比例達半數以上之合夥、公司',
      conditions: [
        '主要負責人或代表人具原住民身分且設籍本市滿1年',
        '商業登記或立案地址位於本市',
        '營業項目不得違反法令或要點排除清單',
        '完成本府指定之創業輔導課程',
        '貸款利息補貼期間及啟動金額依年度預算核定',
      ],
    },
  ],
}

/** Convenience export for callers that only need the record list before JSON loading exists. */
export const mockGovernmentAids = mockGovernmentAidDataset.records

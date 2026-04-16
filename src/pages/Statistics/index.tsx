import React, { useEffect } from 'react'
import { Card, Row, Col, Statistic, Empty, Typography } from 'antd'
import {
  BookOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useStatisticsStore } from '../../stores'

const { Title } = Typography

const StatisticsPage: React.FC = () => {
  const { overview, subjectStats, dailyStats, refreshAll } = useStatisticsStore()

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  // 科目分布饼图配置
  const subjectPieOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 12 },
    },
    series: [
      {
        name: '错题分布',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 12, fontWeight: 'bold' },
        },
        labelLine: { show: false },
        data: subjectStats.map((s) => ({
          value: s.total,
          name: s.name,
          itemStyle: { color: s.color },
        })),
      },
    ],
  }

  // 学习趋势折线图配置
  const trendLineOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
    },
    legend: {
      data: ['复习次数', '精通次数'],
      bottom: 0,
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { fontSize: 11 },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      axisLabel: { fontSize: 10 },
      data: dailyStats.map((d) => d.date.substring(5)),
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10 },
      splitLine: { lineStyle: { type: 'dashed', color: '#eee' } },
    },
    series: [
      {
        name: '复习次数',
        type: 'line',
        data: dailyStats.map((d) => d.review_count),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#1677ff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(22, 119, 255, 0.25)' },
              { offset: 1, color: 'rgba(22, 119, 255, 0.02)' },
            ],
          },
        },
      },
      {
        name: '精通次数',
        type: 'line',
        data: dailyStats.map((d) => d.mastered_count),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#52c41a' },
      },
    ],
  }

  // 科目掌握情况柱状图
  const subjectBarOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      data: ['总数', '已掌握'],
      bottom: 0,
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { fontSize: 11 },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      axisLabel: { fontSize: 10 },
      data: subjectStats.map((s) => s.name),
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10 },
      splitLine: { lineStyle: { type: 'dashed', color: '#eee' } },
    },
    series: [
      {
        name: '总数',
        type: 'bar',
        barWidth: '35%',
        data: subjectStats.map((s) => ({
          value: s.total,
          itemStyle: { color: s.color, borderRadius: [4, 4, 0, 0] },
        })),
      },
      {
        name: '已掌握',
        type: 'bar',
        barWidth: '35%',
        data: subjectStats.map((s) => ({
          value: s.mastered,
          itemStyle: { color: '#52c41a', borderRadius: [4, 4, 0, 0] },
        })),
      },
    ],
  }

  return (
    <div className="space-y-4">
      <Title level={4} className="m-0">学习统计</Title>

      {/* 概览统计 */}
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card className="stat-card h-full">
            <Statistic
              title={<span className="text-gray-500 text-sm">总错题数</span>}
              value={overview?.total_questions || 0}
              prefix={<BookOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1677ff', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card h-full">
            <Statistic
              title={<span className="text-gray-500 text-sm">已掌握</span>}
              value={overview?.mastered_questions || 0}
              prefix={<CheckCircleOutlined className="text-green-500" />}
              valueStyle={{ color: '#52c41a', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card h-full">
            <Statistic
              title={<span className="text-gray-500 text-sm">今日待复习</span>}
              value={overview?.today_reviews || 0}
              prefix={<SyncOutlined className="text-orange-500" />}
              valueStyle={{ color: '#fa8c16', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card h-full">
            <Statistic
              title={<span className="text-gray-500 text-sm">今日已复习</span>}
              value={overview?.completed_today || 0}
              prefix={<CalendarOutlined className="text-cyan-500" />}
              valueStyle={{ color: '#13c2c2', fontSize: 28 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={16}>
        <Col span={12}>
          <Card size="small" title={<span className="text-gray-600 text-sm">科目分布</span>}>
            {subjectStats.length > 0 ? (
              <ReactECharts option={subjectPieOption} style={{ height: 240 }} />
            ) : (
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title={<span className="text-gray-600 text-sm">科目掌握情况</span>}>
            {subjectStats.length > 0 ? (
              <ReactECharts option={subjectBarOption} style={{ height: 240 }} />
            ) : (
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>

      <Card size="small" title={<span className="text-gray-600 text-sm">近30天学习趋势</span>}>
        {dailyStats.length > 0 ? (
          <ReactECharts option={trendLineOption} style={{ height: 280 }} />
        ) : (
          <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>
    </div>
  )
}

export default StatisticsPage

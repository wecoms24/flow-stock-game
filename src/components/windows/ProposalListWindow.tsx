import { useState, useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { RetroButton } from '../ui/RetroButton'
import type { ProposalStatus, TradeProposal } from '../../types/trade'

type FilterStatus = 'ALL' | ProposalStatus
type SortBy = 'latest' | 'oldest' | 'confidence_high' | 'confidence_low'

export function ProposalListWindow() {
  const proposals = useGameStore((s) => s.proposals)
  const employees = useGameStore((s) => s.player.employees)

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL')
  const [sortBy, setSortBy] = useState<SortBy>('latest')

  // 필터링 및 정렬된 제안서 목록
  const filteredProposals = useMemo(() => {
    let filtered = proposals

    // 상태 필터
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter((p) => p.status === filterStatus)
    }

    // 정렬
    const sorted = [...filtered]
    switch (sortBy) {
      case 'latest':
        sorted.sort((a, b) => b.createdAt - a.createdAt)
        break
      case 'oldest':
        sorted.sort((a, b) => a.createdAt - b.createdAt)
        break
      case 'confidence_high':
        sorted.sort((a, b) => b.confidence - a.confidence)
        break
      case 'confidence_low':
        sorted.sort((a, b) => a.confidence - b.confidence)
        break
    }

    return sorted
  }, [proposals, filterStatus, sortBy])

  // 직원 이름 조회 헬퍼
  const getEmployeeName = (id: string | null) => {
    if (!id || id === 'SYSTEM') return 'SYSTEM'
    const emp = employees.find((e) => e.id === id)
    return emp ? emp.name : '퇴사'
  }

  // 상태 뱃지 색상
  const getStatusColor = (status: ProposalStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-blue-500 text-white'
      case 'APPROVED':
        return 'bg-green-500 text-white'
      case 'REJECTED':
        return 'bg-red-500 text-white'
      case 'EXECUTED':
        return 'bg-yellow-600 text-white'
      case 'FAILED':
        return 'bg-gray-500 text-white'
      case 'EXPIRED':
        return 'bg-gray-400 text-white'
    }
  }

  // 상태 한글명
  const getStatusText = (status: ProposalStatus) => {
    switch (status) {
      case 'PENDING':
        return '대기중'
      case 'APPROVED':
        return '승인됨'
      case 'REJECTED':
        return '반려됨'
      case 'EXECUTED':
        return '체결됨'
      case 'FAILED':
        return '실패'
      case 'EXPIRED':
        return '만료됨'
    }
  }

  // 상태별 개수 계산
  const statusCounts = useMemo(() => {
    const counts: Record<FilterStatus, number> = {
      ALL: proposals.length,
      PENDING: 0,
      APPROVED: 0,
      EXECUTED: 0,
      REJECTED: 0,
      FAILED: 0,
      EXPIRED: 0,
    }
    proposals.forEach((p) => {
      counts[p.status]++
    })
    return counts
  }, [proposals])

  const filterButtons: { label: string; value: FilterStatus }[] = [
    { label: '전체', value: 'ALL' },
    { label: '대기중', value: 'PENDING' },
    { label: '승인됨', value: 'APPROVED' },
    { label: '체결됨', value: 'EXECUTED' },
    { label: '반려됨', value: 'REJECTED' },
    { label: '실패', value: 'FAILED' },
    { label: '만료됨', value: 'EXPIRED' },
  ]

  return (
    <div className="flex flex-col h-full text-xs">
      {/* 상단 필터 및 정렬 */}
      <div className="win-inset bg-white p-1.5 mb-1">
        {/* 상태 필터 버튼 */}
        <div className="flex gap-1 mb-1 flex-wrap">
          {filterButtons.map((btn) => (
            <RetroButton
              key={btn.value}
              variant={filterStatus === btn.value ? 'primary' : 'default'}
              onClick={() => setFilterStatus(btn.value)}
              className="text-[10px] px-1.5 py-0.5"
            >
              {btn.label} ({statusCounts[btn.value]})
            </RetroButton>
          ))}
        </div>

        {/* 정렬 드롭다운 */}
        <div className="flex items-center gap-1">
          <span className="text-retro-gray">정렬:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="win-inset px-1 py-0.5 text-xs bg-white"
          >
            <option value="latest">최신순</option>
            <option value="oldest">오래된순</option>
            <option value="confidence_high">신뢰도 높은순</option>
            <option value="confidence_low">신뢰도 낮은순</option>
          </select>
        </div>
      </div>

      {/* 제안서 리스트 */}
      <div className="flex-1 overflow-y-auto win-inset bg-white p-1">
        {filteredProposals.length === 0 ? (
          <div className="text-center text-retro-gray py-4">제안서가 없습니다</div>
        ) : (
          <div className="space-y-1">
            {filteredProposals.map((proposal) => (
              <ProposalItem
                key={proposal.id}
                proposal={proposal}
                getEmployeeName={getEmployeeName}
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 개별 제안서 아이템 컴포넌트
function ProposalItem({
  proposal,
  getEmployeeName,
  getStatusColor,
  getStatusText,
}: {
  proposal: TradeProposal
  getEmployeeName: (id: string | null) => string
  getStatusColor: (status: ProposalStatus) => string
  getStatusText: (status: ProposalStatus) => string
}) {
  const [expanded, setExpanded] = useState(false)

  const directionText = proposal.direction === 'buy' ? '매수' : '매도'
  const directionColor = proposal.direction === 'buy' ? 'text-blue-600' : 'text-red-600'

  return (
    <div className="win-inset bg-gray-50 p-1.5">
      {/* 기본 정보 */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 flex-1">
          {/* 상태 뱃지 */}
          <span
            className={`${getStatusColor(proposal.status)} px-1.5 py-0.5 rounded text-[9px] font-bold`}
          >
            {getStatusText(proposal.status)}
          </span>

          {/* 종목명 + 방향 */}
          <span className="font-bold">{proposal.ticker}</span>
          <span className={`${directionColor} font-bold`}>{directionText}</span>

          {/* 수량 × 가격 */}
          <span className="text-retro-gray">
            {proposal.quantity.toLocaleString()}주 × {proposal.targetPrice.toLocaleString()}원
          </span>

          {/* 신뢰도 */}
          <span className="text-retro-gray">신뢰도 {proposal.confidence.toFixed(0)}%</span>
        </div>

        {/* 확장 아이콘 */}
        <span className="text-retro-gray">{expanded ? '▼' : '▶'}</span>
      </div>

      {/* 확장 정보 */}
      {expanded && (
        <div className="mt-1 pt-1 border-t border-gray-300 space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span className="text-retro-gray">분석:</span>
            <span>{getEmployeeName(proposal.createdByEmployeeId)}</span>
          </div>
          {proposal.reviewedByEmployeeId && (
            <div className="flex justify-between">
              <span className="text-retro-gray">승인:</span>
              <span>{getEmployeeName(proposal.reviewedByEmployeeId)}</span>
            </div>
          )}
          {proposal.executedByEmployeeId && (
            <div className="flex justify-between">
              <span className="text-retro-gray">체결:</span>
              <span>{getEmployeeName(proposal.executedByEmployeeId)}</span>
            </div>
          )}
          {proposal.executedPrice !== null && (
            <div className="flex justify-between">
              <span className="text-retro-gray">체결가:</span>
              <span>
                {proposal.executedPrice.toLocaleString()}원 (슬리피지:{' '}
                {((proposal.slippage ?? 0) * 100).toFixed(2)}%)
              </span>
            </div>
          )}
          {proposal.rejectReason && (
            <div className="flex justify-between">
              <span className="text-retro-gray">반려 사유:</span>
              <span className="text-red-600">{proposal.rejectReason}</span>
            </div>
          )}
          {proposal.isMistake && (
            <div className="text-yellow-700">⚠️ 시스템 자동 처리 (Manager 부재)</div>
          )}
          <div className="flex justify-between">
            <span className="text-retro-gray">생성 시각:</span>
            <span>Tick {proposal.createdAt.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  )
}

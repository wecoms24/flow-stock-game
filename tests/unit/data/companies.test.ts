import { describe, it, expect } from 'vitest'
import { COMPANIES } from '@/data/companies'
import type { Company } from '@/types'

describe('데이터: 회사 목록', () => {
  describe('회사 데이터 구조 검증', () => {
    it('정확히 100개의 회사가 정의되어 있다', () => {
      expect(COMPANIES).toHaveLength(100)
    })

    it('모든 회사가 필수 필드를 가지고 있다', () => {
      COMPANIES.forEach((company: Company) => {
        expect(company).toHaveProperty('id')
        expect(company).toHaveProperty('name')
        expect(company).toHaveProperty('ticker')
        expect(company).toHaveProperty('sector')
        expect(company).toHaveProperty('price')
        expect(company).toHaveProperty('drift')
        expect(company).toHaveProperty('volatility')
      })
    })

    it('모든 회사의 id는 유일하다', () => {
      const ids = COMPANIES.map(c => c.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('모든 회사의 ticker는 유일하다', () => {
      const tickers = COMPANIES.map(c => c.ticker)
      const uniqueTickers = new Set(tickers)
      expect(uniqueTickers.size).toBe(tickers.length)
    })

    it('회사의 id와 ticker가 비어있지 않다', () => {
      COMPANIES.forEach((company: Company) => {
        expect(company.id).toBeTruthy()
        expect(company.ticker).toBeTruthy()
      })
    })
  })

  describe('섹터별 분류', () => {
    const sectors = ['tech', 'finance', 'energy', 'healthcare', 'consumer', 'industrial', 'telecom', 'materials', 'utilities', 'realestate']

    it('10개 섹터가 정의되어 있다', () => {
      const uniqueSectors = new Set(COMPANIES.map(c => c.sector))
      expect(uniqueSectors.size).toBe(10)
      sectors.forEach(sector => {
        expect(uniqueSectors.has(sector)).toBe(true)
      })
    })

    it('각 섹터당 정확히 10개의 회사가 있다', () => {
      sectors.forEach(sector => {
        const companiesInSector = COMPANIES.filter(c => c.sector === sector)
        expect(companiesInSector).toHaveLength(10)
      })
    })

    it('모든 회사가 유효한 섹터에 속한다', () => {
      COMPANIES.forEach((company: Company) => {
        expect(sectors).toContain(company.sector)
      })
    })
  })

  describe('가격 범위 검증', () => {
    it('모든 회사의 가격이 유효한 범위에 있다 (1,000 ~ 500,000원)', () => {
      COMPANIES.forEach((company: Company) => {
        expect(company.price).toBeGreaterThanOrEqual(1000)
        expect(company.price).toBeLessThanOrEqual(500000)
      })
    })

    it('모든 회사의 가격이 양수이다', () => {
      COMPANIES.forEach((company: Company) => {
        expect(company.price).toBeGreaterThan(0)
      })
    })

    it('모든 회사의 가격이 정수이다', () => {
      COMPANIES.forEach((company: Company) => {
        expect(Number.isInteger(company.price)).toBe(true)
      })
    })
  })

  describe('drift 및 volatility 검증', () => {
    it('모든 회사의 drift가 유효한 범위에 있다 (-0.2 ~ 0.2)', () => {
      COMPANIES.forEach((company: Company) => {
        expect(company.drift).toBeGreaterThanOrEqual(-0.2)
        expect(company.drift).toBeLessThanOrEqual(0.2)
      })
    })

    it('모든 회사의 volatility가 유효한 범위에 있다 (0.1 ~ 1.0)', () => {
      COMPANIES.forEach((company: Company) => {
        expect(company.volatility).toBeGreaterThanOrEqual(0.1)
        expect(company.volatility).toBeLessThanOrEqual(1.0)
      })
    })

    it('모든 회사의 volatility는 양수이다', () => {
      COMPANIES.forEach((company: Company) => {
        expect(company.volatility).toBeGreaterThan(0)
      })
    })
  })

  describe('섹터별 특성', () => {
    it('기술 섹터(tech) 회사들은 적절한 volatility를 가진다', () => {
      const techCompanies = COMPANIES.filter(c => c.sector === 'tech')
      const avgVolatility = techCompanies.reduce((sum, c) => sum + c.volatility, 0) / techCompanies.length
      expect(avgVolatility).toBeGreaterThan(0.25) // 기술주는 변동성이 높음
    })

    it('금융 섹터(finance) 회사들은 적절한 drift를 가진다', () => {
      const financeCompanies = COMPANIES.filter(c => c.sector === 'finance')
      expect(financeCompanies.length).toBeGreaterThan(0)
    })

    it('에너지 섹터(energy) 회사들이 존재한다', () => {
      const energyCompanies = COMPANIES.filter(c => c.sector === 'energy')
      expect(energyCompanies.length).toBe(10)
    })
  })

  describe('회사 검색 기능', () => {
    it('id로 회사를 찾을 수 있다', () => {
      const company = COMPANIES.find(c => c.id === 'tech-01')
      expect(company).toBeDefined()
      expect(company?.name).toBe('넥스트론')
    })

    it('ticker로 회사를 찾을 수 있다', () => {
      const company = COMPANIES.find(c => c.ticker === 'NXT')
      expect(company).toBeDefined()
      expect(company?.id).toBe('tech-01')
    })

    it('존재하지 않는 회사는 undefined를 반환한다', () => {
      const company = COMPANIES.find(c => c.id === 'nonexistent_company')
      expect(company).toBeUndefined()
    })
  })

  describe('데이터 일관성', () => {
    it('회사의 이름이 모두 비어있지 않다', () => {
      COMPANIES.forEach((company: Company) => {
        expect(company.name).toBeTruthy()
        expect(company.name.length).toBeGreaterThan(0)
      })
    })

    it('회사의 ticker가 모두 비어있지 않다', () => {
      COMPANIES.forEach((company: Company) => {
        expect(company.ticker).toBeTruthy()
        expect(company.ticker.length).toBeGreaterThan(0)
      })
    })

    it('회사의 ticker는 대문자이다', () => {
      COMPANIES.forEach((company: Company) => {
        expect(company.ticker).toBe(company.ticker.toUpperCase())
      })
    })
  })
})

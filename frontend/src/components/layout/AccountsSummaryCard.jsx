import React from 'react'
import { FiBarChart2 } from 'react-icons/fi'
import { Card } from '../ui'
import { formatCurrency } from '../../utils/formatters'
import { getTotal } from './accountsUtils'

const AccountsSummaryCard = ({ grouped }) => {
  if (!grouped) return null
  
  const assets = [...(grouped.cash || []), ...(grouped.investment || [])]
  const liabilities = [...(grouped.credit || []), ...(grouped.loan || [])]
  const assetTotal = getTotal(assets)
  const liabilityTotal = getTotal(liabilities)
  const netWorth = assetTotal + liabilityTotal

  return (
    <Card className="p-0 w-full overflow-hidden">
      {/* Card Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 20px',
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#3b82f615',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3b82f6'
          }}>
            <FiBarChart2 size={18} />
          </div>
          <h2 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#1f2937'
          }}>Net Worth</h2>
        </div>
        <p style={{
          fontSize: '14px',
          fontWeight: '500',
          color: netWorth >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
        }}>{formatCurrency(netWorth)}</p>
      </div>
      
      {/* Card Content */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          {/* Assets Section */}
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <div style={{
                fontSize: '12px',
                color: '#6b7280'
              }}>Assets</div>
              <div style={{
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--color-success)'
              }}>{formatCurrency(assetTotal)}</div>
            </div>
            
            {/* Assets Breakdown Bar */}
            <div style={{
              display: 'flex',
              height: '8px',
              gap: '2px',
              marginBottom: '8px'
            }}>
              {getTotal(grouped?.cash || []) > 0 && (
                <div style={{
                  flex: getTotal(grouped?.cash || []) / assetTotal,
                  backgroundColor: 'var(--color-breakdown-cash)',
                  borderRadius: '4px'
                }} />
              )}
              {getTotal(grouped?.investment || []) > 0 && (
                <div style={{
                  flex: getTotal(grouped?.investment || []) / assetTotal,
                  backgroundColor: 'var(--color-breakdown-investment)',
                  borderRadius: '4px'
                }} />
              )}
            </div>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              fontSize: '11px',
              color: '#4b5563'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-breakdown-cash)'
                  }} />
                  <span>Cash</span>
                </div>
                <span>{formatCurrency(getTotal(grouped?.cash || []))}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-breakdown-investment)'
                  }} />
                  <span>Investments</span>
                </div>
                <span>{formatCurrency(getTotal(grouped?.investment || []))}</span>
              </div>
            </div>
          </div>
          
          {/* Liabilities Section */}
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <div style={{
                fontSize: '12px',
                color: '#6b7280'
              }}>Liabilities</div>
              <div style={{
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--color-danger)'
              }}>{formatCurrency(liabilityTotal)}</div>
            </div>
            
            {/* Liabilities Breakdown Bar */}
            <div style={{
              display: 'flex',
              height: '8px',
              gap: '2px',
              marginBottom: '8px'
            }}>
              {Math.abs(getTotal(grouped?.credit || [])) > 0 && (
                <div style={{
                  flex: Math.abs(getTotal(grouped?.credit || [])) / Math.abs(liabilityTotal),
                  backgroundColor: 'var(--color-breakdown-credit)',
                  borderRadius: '4px'
                }} />
              )}
              {Math.abs(getTotal(grouped?.loan || [])) > 0 && (
                <div style={{
                  flex: Math.abs(getTotal(grouped?.loan || [])) / Math.abs(liabilityTotal),
                  backgroundColor: 'var(--color-breakdown-loan)',
                  borderRadius: '4px'
                }} />
              )}
            </div>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              fontSize: '11px',
              color: '#4b5563'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-breakdown-credit)'
                  }} />
                  <span>Credit Cards</span>
                </div>
                <span>{formatCurrency(getTotal(grouped?.credit || []))}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-breakdown-loan)'
                  }} />
                  <span>Loans</span>
                </div>
                <span>{formatCurrency(getTotal(grouped?.loan || []))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default AccountsSummaryCard 
import React from 'react'
import { FaUniversity } from 'react-icons/fa'
import { Card } from '../ui'
import { formatCurrency, formatLastUpdated } from '../../utils/formatters'

const AccountsList = ({ accounts, activeTab, getAccountTypeIcon, getTotal }) => {
  const capitalizeWords = (str) => {
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  }
  
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
          {(() => {
            const { icon: IconComponent, color: iconColor } = getAccountTypeIcon(activeTab)
            return (
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: iconColor + '15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: iconColor
              }}>
                <IconComponent size={18} />
              </div>
            )
          })()}
                      <h2 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1f2937'
            }}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
          </div>
          <p style={{
            fontSize: '14px',
            fontWeight: '400',
            color: getTotal(accounts) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
          }}>{formatCurrency(getTotal(accounts))}</p>
      </div>
      
      {/* Card Content */}
      <div style={{ padding: '12px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {accounts.map(acc => {
            const balance = acc.balances?.current || 0
            const isPositive = balance > 0
            const isZero = balance === 0
            
            return (
              <div key={acc.account_id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '4px',
                paddingTop: '4px',
                borderBottom: '1px solid #f3f4f6',
                minHeight: '48px'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ 
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}>
                        {acc.institution_logo ? (
                          <img 
                            src={acc.institution_logo} 
                            alt={acc.institution_name || 'Bank'}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.nextSibling.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div style={{
                          display: acc.institution_logo ? 'none' : 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                          height: '100%',
                          color: '#6b7280'
                        }}>
                          <FaUniversity size={12} />
                        </div>
                      </div>
                      <div>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '500',
                          color: '#111827',
                          marginBottom: '2px'
                        }}>{acc.name}</div>
                        <div style={{
                          fontSize: '10px',
                          color: '#6b7280'
                        }}>{capitalizeWords(acc.subtype)} {acc.mask ? `• ****${acc.mask}` : ''}</div>
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      marginLeft: '16px',
                      justifyContent: 'center',
                      minHeight: '48px'
                    }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: isZero ? '#6b7280' : (isPositive ? 'var(--color-success)' : 'var(--color-danger)'),
                        marginBottom: '2px'
                      }}>
                        {formatCurrency(balance)}
                      </div>
                      {acc.updated_at && (
                        <div style={{
                          fontSize: '9px',
                          color: '#9ca3af'
                        }}>
                          Last updated: {formatLastUpdated(acc.updated_at)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

export default AccountsList 
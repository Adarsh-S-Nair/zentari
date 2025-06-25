import React from 'react'
import { Table } from './index'

function OrdersTable({ tradeHistoryByDate, isMobile }) {
  // Convert trade_history_by_date to flat array of orders
  const orders = Object.entries(tradeHistoryByDate || {})
    .flatMap(([date, dateOrders]) => 
      dateOrders.map(order => ({
        ...order,
        date
      }))
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort descending

  const columns = [
    {
      key: 'date',
      header: 'Date',
      width: '1fr',
      align: 'text-left',
      headerAlign: 'text-left',
      type: 'date'
    },
    {
      key: 'ticker',
      header: 'Symbol',
      width: '1fr',
      align: 'text-center',
      headerAlign: 'text-center',
      type: 'text'
    },
    {
      key: 'action',
      header: 'Type',
      width: '1fr',
      align: 'text-center',
      headerAlign: 'text-center',
      type: 'pill',
      pillType: 'action'
    },
    {
      key: 'price',
      header: 'Price',
      width: '1fr',
      align: 'text-right',
      headerAlign: 'text-right',
      type: 'currency'
    },
    {
      key: 'shares',
      header: 'Quantity',
      width: '1fr',
      align: 'text-right',
      headerAlign: 'text-right',
      type: 'shares'
    },
    {
      key: 'amount',
      header: 'Amount',
      width: '1fr',
      align: 'text-right',
      headerAlign: 'text-right',
      type: 'currency'
    }
  ]

  return (
    <Table
      data={orders}
      columns={columns}
      isMobile={isMobile}
      emptyMessage="No orders found"
      minWidth="648px"
    />
  )
}

export default OrdersTable 
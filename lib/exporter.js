const Decimal = require("decimal.js");

class PortfolioExporter {
  constructor(db) {
    this.db = db;
  }

  // Export portfolio to CSV format
  async exportToCSV(userId, transactions, balances) {
    let csv = "Type,Asset,Amount,Price,Value,Date\n";

    // Export transactions
    transactions.forEach(tx => {
      const line = [
        tx.type,
        tx.fromAsset || tx.asset,
        tx.amount,
        tx.price || '',
        tx.value || '',
        new Date(tx.timestamp).toLocaleString()
      ].join(',');
      csv += line + '\n';
    });

    return csv;
  }

  // Export for tax reporting
  async exportForTaxes(userId, year) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const result = await this.db.allDocs({
      include_docs: true,
      startkey: `tx_${userId}_`,
      endkey: `tx_${userId}_\ufff0`
    });

    const transactions = result.rows
      .map(row => row.doc)
      .filter(tx => {
        const txDate = new Date(tx.timestamp);
        return txDate >= startDate && txDate <= endDate;
      });

    let taxReport = `Tax Report for ${year}\n\n`;
    taxReport += "Date,Type,Asset,Amount,Cost Basis,Proceeds,Gain/Loss\n";

    transactions.forEach(tx => {
      if (tx.type === 'sell') {
        const line = [
          new Date(tx.timestamp).toLocaleDateString(),
          tx.type,
          tx.fromAsset,
          tx.amount,
          tx.costBasis || '',
          tx.proceeds || '',
          tx.gainLoss || ''
        ].join(',');
        taxReport += line + '\n';
      }
    });

    return taxReport;
  }

  // Export portfolio summary
  async exportSummary(userId, balances, totalValue, pnl) {
    let summary = "Portfolio Summary\n";
    summary += "=================\n\n";
    summary += `Total Value: ${totalValue} ETH\n`;
    summary += `P&L: ${pnl.absolute} ETH (${pnl.percentage}%)\n`;
    summary += `ROI: ${pnl.roi}%\n\n`;
    summary += "Holdings:\n";
    
    balances.forEach((balance, asset) => {
      summary += `  ${asset}: ${balance}\n`;
    });

    summary += `\nGenerated: ${new Date().toISOString()}\n`;
    return summary;
  }

  // Export to JSON
  async exportToJSON(userId, portfolio, transactions, analytics) {
    return JSON.stringify({
      userId,
      portfolio,
      transactions,
      analytics,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  // Store export for later retrieval
  async saveExport(userId, data, format) {
    const exportId = `export_${userId}_${Date.now()}`;
    await this.db.put({
      _id: exportId,
      userId,
      data,
      format,
      createdAt: new Date().toISOString()
    });
    return exportId;
  }
}

module.exports = PortfolioExporter;

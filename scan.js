// api/scan.js - Vercel Serverless Function
const fetch = require('node-fetch');

// Yahoo Finance API 설정
const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance';

// 주요 한국 종목 리스트 (Yahoo Finance 심볼: .KS = KOSPI, .KQ = KOSDAQ)
const stockUniverse = [
  { code: '005930.KS', name: '삼성전자', koreanCode: '005930', sector: '전기전자' },
  { code: '000660.KS', name: 'SK하이닉스', koreanCode: '000660', sector: '전기전자' },
  { code: '035420.KS', name: 'NAVER', koreanCode: '035420', sector: 'IT' },
  { code: '005380.KS', name: '현대차', koreanCode: '005380', sector: '자동차' },
  { code: '051910.KS', name: 'LG화학', koreanCode: '051910', sector: '화학' },
  { code: '006400.KS', name: '삼성SDI', koreanCode: '006400', sector: '전기전자' },
  { code: '035720.KS', name: '카카오', koreanCode: '035720', sector: 'IT' },
  { code: '028260.KS', name: '삼성물산', koreanCode: '028260', sector: '유통' },
  { code: '068270.KS', name: '셀트리온', koreanCode: '068270', sector: '제약/바이오' },
  { code: '207940.KS', name: '삼성바이오로직스', koreanCode: '207940', sector: '제약/바이오' },
  { code: '005490.KS', name: 'POSCO홀딩스', koreanCode: '005490', sector: '철강' },
  { code: '012330.KS', name: '현대모비스', koreanCode: '012330', sector: '자동차' },
  { code: '066570.KS', name: 'LG전자', koreanCode: '066570', sector: '전기전자' },
  { code: '003550.KS', name: 'LG', koreanCode: '003550', sector: '기타' },
  { code: '096770.KS', name: 'SK이노베이션', koreanCode: '096770', sector: '화학' },
  { code: '017670.KS', name: 'SK텔레콤', koreanCode: '017670', sector: '통신' },
  { code: '009150.KS', name: '삼성전기', koreanCode: '009150', sector: '전기전자' },
  { code: '011200.KS', name: 'HMM', koreanCode: '011200', sector: '운수' },
  { code: '086790.KS', name: '하나금융지주', koreanCode: '086790', sector: '금융' },
  { code: '055550.KS', name: '신한지주', koreanCode: '055550', sector: '금융' }
];


// Yahoo Finance에서 현재가 조회
async function getCurrentPrice(stockCode) {
  try {
    const url = `${YAHOO_BASE_URL}/chart/${stockCode}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const data = await response.json();
    
    if (data.chart && data.chart.result && data.chart.result[0]) {
      const result = data.chart.result[0];
      const meta = result.meta;
      const quote = result.indicators.quote[0];
      
      const currentPrice = meta.regularMarketPrice || quote.close[quote.close.length - 1];
      const previousClose = meta.previousClose || meta.chartPreviousClose;
      const priceChange = ((currentPrice - previousClose) / previousClose) * 100;
      const volume = quote.volume[quote.volume.length - 1];
      
      return {
        currentPrice: Math.round(currentPrice),
        priceChange: parseFloat(priceChange.toFixed(2)),
        volume: volume,
        tradeValue: Math.round(currentPrice * volume)
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Price error for ${stockCode}:`, error);
    return null;
  }
}

// 일봉 데이터 조회 (POC 계산용)
async function getDailyData(stockCode, days = 30) {
  try {
    const period2 = Math.floor(Date.now() / 1000);
    const period1 = period2 - (days * 24 * 60 * 60);
    
    const url = `${YAHOO_BASE_URL}/chart/${stockCode}?period1=${period1}&period2=${period2}&interval=1d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const data = await response.json();
    
    if (data.chart && data.chart.result && data.chart.result[0]) {
      const result = data.chart.result[0];
      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];
      
      const dailyData = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (quote.open[i] && quote.high[i] && quote.low[i] && quote.close[i] && quote.volume[i]) {
          dailyData.push({
            date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
            open: Math.round(quote.open[i]),
            high: Math.round(quote.high[i]),
            low: Math.round(quote.low[i]),
            close: Math.round(quote.close[i]),
            volume: quote.volume[i]
          });
        }
      }
      
      return dailyData;
    }
    
    return [];
  } catch (error) {
    console.error(`Daily data error for ${stockCode}:`, error);
    return [];
  }
}

// POC (Point of Control) 계산
function calculatePOC(dailyData) {
  if (!dailyData || dailyData.length === 0) return null;

  // 가격대별 거래량 집계
  const volumeProfile = {};
  
  dailyData.forEach(day => {
    const priceRange = Math.floor(day.close / 100) * 100; // 100원 단위로 묶음
    if (!volumeProfile[priceRange]) {
      volumeProfile[priceRange] = 0;
    }
    volumeProfile[priceRange] += day.volume;
  });

  // 최대 거래량 가격대 찾기 (POC)
  let maxVolume = 0;
  let poc = 0;

  Object.entries(volumeProfile).forEach(([price, volume]) => {
    if (volume > maxVolume) {
      maxVolume = volume;
      poc = parseInt(price);
    }
  });

  return {
    poc,
    volumeProfile: Object.entries(volumeProfile).map(([price, volume]) => ({
      price: parseInt(price),
      volume
    })).sort((a, b) => b.price - a.price)
  };
}

// 매매 시그널 분석
function analyzeSignal(stock, currentData, pocData, conditions) {
  if (!currentData || !pocData) return null;

  const { currentPrice, priceChange, volume, tradeValue } = currentData;
  const { poc, volumeProfile } = pocData;

  // 조건 필터링
  if (currentPrice < conditions.minPrice || currentPrice > conditions.maxPrice) {
    return null;
  }

  if (tradeValue < conditions.minTradeValue * 1000000) { // 백만원 단위 변환
    return null;
  }

  // 평균 거래량 계산
  const avgVolume = volumeProfile.reduce((sum, v) => sum + v.volume, 0) / volumeProfile.length;
  const volumeRatio = volume / avgVolume;

  if (volumeRatio < conditions.volumeMultiplier) {
    return null;
  }

  // POC 대비 가격 차이
  const priceDiffFromPOC = Math.abs(((currentPrice - poc) / poc) * 100);
  
  let signal = null;
  const reasons = [];
  let signalStrength = 0;

  // 매수 시그널: POC 지지 + 반등
  if (priceDiffFromPOC <= conditions.pocTolerance) {
    if (currentPrice >= poc * 0.98 && priceChange > conditions.bounceStrength) {
      signal = 'BUY';
      reasons.push(`POC(${poc.toLocaleString()}원) 지지 후 ${priceChange.toFixed(2)}% 반등`);
      reasons.push(`거래량 평균 대비 ${volumeRatio.toFixed(2)}배 증가`);
      signalStrength = 60 + Math.min(priceChange * 5, 30);
    }
  }

  // 매도 시그널: POC 저항 + 하락
  if (currentPrice > poc * 1.01 && priceDiffFromPOC <= 3) {
    if (priceChange < -1 && volumeRatio > conditions.volumeMultiplier * 1.2) {
      signal = 'SELL';
      reasons.push(`POC 저항선에서 ${Math.abs(priceChange).toFixed(2)}% 하락`);
      reasons.push(`고거래량 동반 저항`);
      signalStrength = 50 + Math.min(Math.abs(priceChange) * 5, 30);
    }
  }

  if (!signal) return null;

  return {
    ...stock,
    signal,
    currentPrice,
    poc,
    priceChange,
    volume,
    avgVolume: Math.round(avgVolume),
    volumeRatio,
    tradeValue: Math.round(tradeValue / 1000000), // 백만원 단위
    reasons,
    signalStrength,
    volumeProfile: volumeProfile.slice(0, 10) // 상위 10개만
  };
}

// 메인 핸들러
module.exports = async (req, res) => {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 요청 파라미터
    const conditions = {
      pocTolerance: parseFloat(req.query.pocTolerance || 2),
      bounceStrength: parseFloat(req.query.bounceStrength || 1),
      volumeMultiplier: parseFloat(req.query.volumeMultiplier || 1.5),
      minPrice: parseFloat(req.query.minPrice || 5000),
      maxPrice: parseFloat(req.query.maxPrice || 100000),
      minTradeValue: parseFloat(req.query.minTradeValue || 1000)
    };

    // 모든 종목 분석
    const recommendations = [];
    
    for (const stock of stockUniverse) {
      try {
        // API 호출 제한 방지 (0.2초 대기)
        await new Promise(resolve => setTimeout(resolve, 200));

        const [currentData, dailyData] = await Promise.all([
          getCurrentPrice(stock.code),
          getDailyData(stock.code, 30)
        ]);

        if (!currentData || !dailyData || dailyData.length === 0) continue;

        const pocData = calculatePOC(dailyData);
        const analysis = analyzeSignal(stock, currentData, pocData, conditions);

        if (analysis) {
          recommendations.push(analysis);
        }
      } catch (error) {
        console.error(`Error analyzing ${stock.code}:`, error);
      }
    }

    // 시그널 강도순 정렬
    recommendations.sort((a, b) => b.signalStrength - a.signalStrength);

    res.status(200).json({
      success: true,
      totalScanned: stockUniverse.length,
      recommendations,
      timestamp: new Date().toISOString(),
      dataSource: 'Yahoo Finance'
    });

  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};

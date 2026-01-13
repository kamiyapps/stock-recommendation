// api/scan-kis.js - 한국투자증권 API 버전
// 이 파일은 한국투자증권 API 발급 후 사용하세요
// 사용 시: api/scan.js를 이 파일로 교체하고 Vercel 환경변수 설정 필요

const fetch = require('node-fetch');

// 한국투자증권 API 설정
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = process.env.KIS_APP_KEY;
const APP_SECRET = process.env.KIS_APP_SECRET;

// 액세스 토큰 캐시
let tokenCache = {
  token: null,
  expiresAt: 0
};

// 주요 종목 리스트
const stockUniverse = [
  { code: '005930', name: '삼성전자', sector: '전기전자' },
  { code: '000660', name: 'SK하이닉스', sector: '전기전자' },
  { code: '035420', name: 'NAVER', sector: 'IT' },
  { code: '005380', name: '현대차', sector: '자동차' },
  { code: '051910', name: 'LG화학', sector: '화학' },
  { code: '006400', name: '삼성SDI', sector: '전기전자' },
  { code: '035720', name: '카카오', sector: 'IT' },
  { code: '028260', name: '삼성물산', sector: '유통' },
  { code: '068270', name: '셀트리온', sector: '제약/바이오' },
  { code: '207940', name: '삼성바이오로직스', sector: '제약/바이오' },
  { code: '005490', name: 'POSCO홀딩스', sector: '철강' },
  { code: '012330', name: '현대모비스', sector: '자동차' },
  { code: '066570', name: 'LG전자', sector: '전기전자' },
  { code: '003550', name: 'LG', sector: '기타' },
  { code: '096770', name: 'SK이노베이션', sector: '화학' },
  { code: '017670', name: 'SK텔레콤', sector: '통신' },
  { code: '009150', name: '삼성전기', sector: '전기전자' },
  { code: '011200', name: 'HMM', sector: '운수' },
  { code: '086790', name: '하나금융지주', sector: '금융' },
  { code: '055550', name: '신한지주', sector: '금융' }
];

// 액세스 토큰 발급
async function getAccessToken() {
  const now = Date.now();
  
  if (tokenCache.token && tokenCache.expiresAt > now) {
    return tokenCache.token;
  }

  try {
    const response = await fetch(`${KIS_BASE_URL}/oauth2/tokenP`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: APP_KEY,
        appsecret: APP_SECRET
      })
    });

    const data = await response.json();
    
    if (data.access_token) {
      tokenCache.token = data.access_token;
      tokenCache.expiresAt = now + (23 * 60 * 60 * 1000);
      return data.access_token;
    }
    
    throw new Error('Failed to get access token');
  } catch (error) {
    console.error('Token error:', error);
    throw error;
  }
}

// 현재가 조회
async function getCurrentPrice(token, stockCode) {
  try {
    const response = await fetch(
      `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price?` +
      `fid_cond_mrkt_div_code=J&fid_input_iscd=${stockCode}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`,
          'appkey': APP_KEY,
          'appsecret': APP_SECRET,
          'tr_id': 'FHKST01010100'
        }
      }
    );

    const data = await response.json();
    
    if (data.rt_cd === '0' && data.output) {
      return {
        currentPrice: parseInt(data.output.stck_prpr),
        priceChange: parseFloat(data.output.prdy_ctrt),
        volume: parseInt(data.output.acml_vol),
        tradeValue: parseInt(data.output.acml_tr_pbmn)
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Price error for ${stockCode}:`, error);
    return null;
  }
}

// 일봉 데이터 조회
async function getDailyData(token, stockCode, days = 30) {
  try {
    const response = await fetch(
      `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-price?` +
      `fid_cond_mrkt_div_code=J&fid_input_iscd=${stockCode}&` +
      `fid_period_div_code=D&fid_org_adj_prc=0`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`,
          'appkey': APP_KEY,
          'appsecret': APP_SECRET,
          'tr_id': 'FHKST01010400'
        }
      }
    );

    const data = await response.json();
    
    if (data.rt_cd === '0' && data.output) {
      return data.output.slice(0, days).map(item => ({
        date: item.stck_bsop_date,
        open: parseInt(item.stck_oprc),
        high: parseInt(item.stck_hgpr),
        low: parseInt(item.stck_lwpr),
        close: parseInt(item.stck_clpr),
        volume: parseInt(item.acml_vol)
      }));
    }
    
    return [];
  } catch (error) {
    console.error(`Daily data error for ${stockCode}:`, error);
    return [];
  }
}

// POC 계산
function calculatePOC(dailyData) {
  if (!dailyData || dailyData.length === 0) return null;

  const volumeProfile = {};
  
  dailyData.forEach(day => {
    const priceRange = Math.floor(day.close / 100) * 100;
    if (!volumeProfile[priceRange]) {
      volumeProfile[priceRange] = 0;
    }
    volumeProfile[priceRange] += day.volume;
  });

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

  if (currentPrice < conditions.minPrice || currentPrice > conditions.maxPrice) {
    return null;
  }

  if (tradeValue < conditions.minTradeValue * 1000000) {
    return null;
  }

  const avgVolume = volumeProfile.reduce((sum, v) => sum + v.volume, 0) / volumeProfile.length;
  const volumeRatio = volume / avgVolume;

  if (volumeRatio < conditions.volumeMultiplier) {
    return null;
  }

  const priceDiffFromPOC = Math.abs(((currentPrice - poc) / poc) * 100);
  
  let signal = null;
  const reasons = [];
  let signalStrength = 0;

  // 매수 시그널
  if (priceDiffFromPOC <= conditions.pocTolerance) {
    if (currentPrice >= poc * 0.98 && priceChange > conditions.bounceStrength) {
      signal = 'BUY';
      reasons.push(`POC(${poc.toLocaleString()}원) 지지 후 ${priceChange.toFixed(2)}% 반등`);
      reasons.push(`거래량 평균 대비 ${volumeRatio.toFixed(2)}배 증가`);
      signalStrength = 60 + Math.min(priceChange * 5, 30);
    }
  }

  // 매도 시그널
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
    tradeValue: Math.round(tradeValue / 1000000),
    reasons,
    signalStrength,
    volumeProfile: volumeProfile.slice(0, 10)
  };
}

// 메인 핸들러
module.exports = async (req, res) => {
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
    const conditions = {
      pocTolerance: parseFloat(req.query.pocTolerance || 2),
      bounceStrength: parseFloat(req.query.bounceStrength || 1),
      volumeMultiplier: parseFloat(req.query.volumeMultiplier || 1.5),
      minPrice: parseFloat(req.query.minPrice || 5000),
      maxPrice: parseFloat(req.query.maxPrice || 100000),
      minTradeValue: parseFloat(req.query.minTradeValue || 1000)
    };

    // API 키 확인
    if (!APP_KEY || !APP_SECRET) {
      return res.status(500).json({
        error: 'API 키가 설정되지 않았습니다. Vercel 환경변수(KIS_APP_KEY, KIS_APP_SECRET)를 확인해주세요.'
      });
    }

    const token = await getAccessToken();
    const recommendations = [];
    
    for (const stock of stockUniverse) {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));

        const [currentData, dailyData] = await Promise.all([
          getCurrentPrice(token, stock.code),
          getDailyData(token, stock.code, 30)
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

    recommendations.sort((a, b) => b.signalStrength - a.signalStrength);

    res.status(200).json({
      success: true,
      totalScanned: stockUniverse.length,
      recommendations,
      timestamp: new Date().toISOString(),
      dataSource: 'Korea Investment Securities'
    });

  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};

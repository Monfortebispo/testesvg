
/* -----------------------------------------------------------------------
   ORCAMENTO -- injeccao de previsao no STORE para meses futuros
----------------------------------------------------------------------- */
const ORC_FORECAST_TAG = '__orc_forecast__'; // marca os STORE sintéticos
const ORC_FIXED_START_MONTH = 7;              // Julho em diante
const ORC_REVENUE_FACTOR = 1.05;              // Receitas = ano anterior +5%
const ORC_COST_FACTOR = 1.08;                 // Custos = ano anterior +8%
function orcIsFixedBudgetMonth(m){ return Number(m) >= ORC_FIXED_START_MONTH; }
function orcHasRealCurrentData(hotel, mes){
  const yr = String(YR_CUR);
  const d = STORE?.[mes];
  if(!d || d[ORC_FORECAST_TAG]) return false;
  const checkHotel = h => {
    const ops = d.hotels_ops?.[h];
    return !!(ops && (n(ops['Receita Total']?.[yr]) > 0 || n(ops.Ocupados?.[yr]) > 0));
  };
  if(hotel) return checkHotel(hotel);
  return (d.hotel_list || []).some(checkHotel);
}
function orcUltimoMesRealCurrent(hotel){
  const meses = Object.keys(STORE || {}).map(Number).filter(m => orcHasRealCurrentData(hotel, m)).sort((a,b)=>a-b);
  return meses.length ? meses[meses.length-1] : 0;
}

function orcInjectForecastToStore() {
  // Determinar meses já realizados com dados reais do ano atual
  const yr = String(YR_CUR), yrp = String(YR_PREV);
  const mesesComDadosCurrent = Object.keys(STORE).map(Number).filter(m => {
    const store = STORE[m];
    if (!store || store[ORC_FORECAST_TAG]) return false;
    // Tem dados reais do ano atual se pelo menos um hotel tem receita > 0
    return (store.hotel_list || []).some(h => {
      const ops = store.hotels_ops?.[h];
      return ops && n(ops['Receita Total']?.[yr]) > 0;
    });
  });
  const ultimoMesReal = mesesComDadosCurrent.length > 0 ? Math.max(...mesesComDadosCurrent) : 0;

  // Para cada mês seleccionado que não tem dados reais do ano atual, gerar previsão
  for (const mes of selectedMeses) {
    // Já tem dados reais do ano atual — não sobrescrever
    if (STORE[mes] && !STORE[mes][ORC_FORECAST_TAG]) {
      const hasRealCurrent = (STORE[mes].hotel_list || []).some(h => {
        const ops = STORE[mes].hotels_ops?.[h];
        return ops && n(ops['Receita Total']?.[yr]) > 0;
      });
      if (hasRealCurrent) continue;
    }

    // Verificar se há dados do ano anterior para este mês (necessários para a previsão)
    if (!STORE[mes] || !STORE[mes].hotel_list) continue;
    const hasDataPrevious = (STORE[mes].hotel_list || []).some(h => {
      const ops = STORE[mes].hotels_ops?.[h];
      return ops && n(ops['Receita Total']?.[yrp]) > 0;
    });
    if (!hasDataPrevious) continue;

    const hotelList = STORE[mes].hotel_list || [];
    const hotels_ops = {}, hotels_costs = {}, hotels_rev = {};

    for (const hotel of hotelList) {
      // Calcular previsão para este hotel/mês
      const prev = orcCalcSimple(hotel, mes, yr, yrp, ultimoMesReal);
      if (!prev) continue;

      hotels_ops[hotel] = {
        'Disponiveis':       { [yr]: prev.disp26,  [yrp]: prev.disp25  },
        'Ocupados':          { [yr]: prev.occ26,   [yrp]: prev.occ25   },
        'Receita Total':     { [yr]: prev.recTotal, [yrp]: prev.recTotal25 },
        'Receita Alojamento':{ [yr]: prev.recAloj,  [yrp]: prev.recAloj25  },
        'Receita FB':        { [yr]: prev.recFB,    [yrp]: prev.recFB25    },
        'Hospedes':          { [yr]: prev.hosp26,   [yrp]: prev.hosp25     },
        'Chegadas':          { [yr]: prev.cheg26,   [yrp]: prev.cheg25     },
        'Dormidas':          { [yr]: prev.dorm26,   [yrp]: prev.dorm25     },
        'Complimentary':     { [yr]: prev.comp26,   [yrp]: prev.comp25     },
        'ADR':               { [yr]: prev.adr26,    [yrp]: prev.adr25      },
        'ADR NET':           { [yr]: prev.adr26,    [yrp]: prev.adr25      },
      };
      hotels_costs[hotel] = {
        'TOTAIS':       { [yr]: prev.custos,    [yrp]: prev.custos25    },
        'PESSOAL':      { [yr]: prev.pessoal,   [yrp]: prev.pessoal25   },
        'ENERGIA':      { [yr]: prev.energia,   [yrp]: prev.energia25   },
        'COMIDAS':      { [yr]: prev.comidas,   [yrp]: prev.comidas25   },
        'BEBIDAS':      { [yr]: prev.bebidas,   [yrp]: prev.bebidas25   },
        'MANUTENÇÃO':   { [yr]: prev.manut,     [yrp]: prev.manut25     },
        'OPERACIONAIS': { [yr]: prev.operac,    [yrp]: prev.operac25    },
        'MARKETING':    { [yr]: prev.market,    [yrp]: prev.market25    },
        'COMUNICAÇÕES': { [yr]: 0,              [yrp]: 0                },
      };
      hotels_rev[hotel] = {
        'ALOJAMENTO':  { [yr]: prev.recAloj,  [yrp]: prev.recAloj25 },
        'ALIMENTACAO': { [yr]: prev.recFB,    [yrp]: prev.recFB25   },
        'DIVERSOS':    { [yr]: prev.diversos, [yrp]: 0              },
      };
    }

    STORE[mes] = {
      ...STORE[mes],  // manter dados do ano anterior
      [ORC_FORECAST_TAG]: true,
      hotel_list: hotelList,
      hotels_ops, hotels_costs, hotels_rev,
      hotels_nop: STORE[mes].hotels_nop || {},
      mes, yr_cur: Number(yr), yr_prev: Number(yrp),
    };
  }
}

// Motor simplificado para injecção — calcula por hotel/mês sem depender de ORC_STATE
function orcCalcSimple(hotel, mesPrev, yr, yrp, ultimoMesReal) {
  const nz = v => Number(v) || 0;

  // Dados de 2025 para este mês — é esta a base oficial do orçamento
  const d25 = STORE[mesPrev];
  if (!d25) return null;
  const ops25 = d25.hotels_ops?.[hotel];
  const costs25 = d25.hotels_costs?.[hotel];
  if (!ops25) return null;

  const recAloj25 = nz(ops25['Receita Alojamento']?.[yrp]);
  const recFB25   = nz(ops25['Receita FB']?.[yrp]);
  const recTotal25Raw = nz(ops25['Receita Total']?.[yrp]);
  const recTotal25 = recTotal25Raw > 0 ? recTotal25Raw : recAloj25 + recFB25;
  const diversos25 = Math.max(0, recTotal25 - recAloj25 - recFB25);
  const occ25     = nz(ops25.Ocupados?.[yrp]);
  const disp25    = nz(ops25.Disponiveis?.[yrp]);
  const hosp25    = nz(ops25.Hospedes?.[yrp]);
  const cheg25    = nz(ops25.Chegadas?.[yrp]);
  const dorm25    = nz(ops25.Dormidas?.[yrp]);
  const comp25    = nz(ops25.Complimentary?.[yrp]);
  const custos25  = nz(costs25?.TOTAIS?.[yrp]);
  const pessoal25 = nz(costs25?.PESSOAL?.[yrp]);
  const energia25 = nz(costs25?.ENERGIA?.[yrp]);
  const comidas25 = nz(costs25?.COMIDAS?.[yrp]);
  const bebidas25 = nz(costs25?.BEBIDAS?.[yrp]);
  const manut25   = nz(costs25?.['MANUTENÇÃO']?.[yrp]);
  const operac25  = nz(costs25?.OPERACIONAIS?.[yrp]);
  const market25  = nz(costs25?.MARKETING?.[yrp]);
  const adr25     = occ25 > 0 ? recAloj25 / occ25 : 0;

  if (recTotal25 === 0 && occ25 === 0) return null;

  let fA, fFB, fC, fOcc;
  if (orcIsFixedBudgetMonth(mesPrev)) {
    // Regra definida: Julho em diante = ano anterior como base +5% receitas e +8% custos
    fA = ORC_REVENUE_FACTOR;
    fFB = ORC_REVENUE_FACTOR;
    fC = ORC_COST_FACTOR;
    fOcc = 1.0;
  } else {
    // Meses anteriores a Julho mantêm a lógica de tendência, caso não exista dado real
    let tA=0, tFB=0, tC=0, tOcc=0, tN=0;
    for (let m = 1; m <= ultimoMesReal; m++) {
      const d = STORE[m];
      if (!d || d[ORC_FORECAST_TAG]) continue;
      const ops = d.hotels_ops?.[hotel];
      const costs = d.hotels_costs?.[hotel];
      if (!ops) continue;
      const ra26=nz(ops['Receita Alojamento']?.[yr]), ra25=nz(ops['Receita Alojamento']?.[yrp]);
      const rfb26=nz(ops['Receita FB']?.[yr]), rfb25=nz(ops['Receita FB']?.[yrp]);
      const ct26=nz(costs?.TOTAIS?.[yr]), ct25=nz(costs?.TOTAIS?.[yrp]);
      const oc26=nz(ops.Ocupados?.[yr]), oc25=nz(ops.Ocupados?.[yrp]);
      if(ra25>0&&ra26>0){tA+=ra26/ra25;tN++;}
      if(rfb25>0&&rfb26>0)tFB+=rfb26/rfb25;
      if(ct25>0&&ct26>0)tC+=ct26/ct25;
      if(oc25>0&&oc26>0)tOcc+=oc26/oc25;
    }
    fA   = tN>0 ? tA/tN : ORC_REVENUE_FACTOR;
    fFB  = tN>0 ? tFB/Math.max(tN,1) : ORC_REVENUE_FACTOR;
    fC   = tN>0 ? tC/Math.max(tN,1) : ORC_COST_FACTOR;
    fOcc = tN>0 ? tOcc/Math.max(tN,1) : 1.0;
  }

  const recAloj  = Math.round(recAloj25 * fA);
  const recFB    = Math.round(recFB25 * fFB);
  const diversos = Math.round(diversos25 * fA);
  const recTotal = Math.round(recTotal25 * fA);
  const occ26    = Math.round(occ25 * fOcc);
  const disp26   = disp25;
  const hosp26   = Math.round(hosp25 * fOcc);
  const cheg26   = Math.round(cheg25 * fOcc);
  const dorm26   = Math.round(dorm25 * fOcc);
  const comp26   = Math.round(comp25);
  const adr26    = occ26 > 0 ? recAloj / occ26 : 0;

  const custos   = Math.round(custos25 * fC);
  const pessoal  = Math.round(pessoal25 * fC);
  const energia  = Math.round(energia25 * fC);
  const comidas  = Math.round(comidas25 * fC);
  const bebidas  = Math.round(bebidas25 * fC);
  const manut    = Math.round(manut25 * fC);
  const operac   = Math.round(operac25 * fC);
  const market   = Math.round(market25 * fC);

  return {
    recAloj25, recFB25, recTotal25, occ25, disp25, hosp25, cheg25, dorm25, comp25, adr25,
    custos25, pessoal25, energia25, comidas25, bebidas25, manut25, operac25, market25,
    recAloj, recFB, recTotal, occ26, disp26, hosp26, cheg26, dorm26, comp26, adr26,
    custos, pessoal, energia, comidas, bebidas, manut, operac, market, diversos,
    fixedBudget: orcIsFixedBudgetMonth(mesPrev), factorAloj:fA, factorFB:fFB, factorCust:fC
  };
}



let ORC_STATE={hotel:null,mesPrev:null,cenario:'base',pickupOcc:null};
const ORC_MESES_NOMES=['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const ORC_DIAS_MES=[0,31,28,31,30,31,30,31,31,30,31,30,31];
const ORC_CENARIO_FACTOR={pessimista:0.90,base:1.00,optimista:1.10};
const ORC_CENARIO_COST_FACTOR={pessimista:1.05,base:1.00,optimista:0.97};

function occQuartosHotel(hotel){
  const MAP={'OPERA':'VG Ópera','PORTO':'VG Porto','PORTO RIBEIRA':'VG Porto Ribeira','ISLA CANELA':'VG Isla Canela','COLLECTION FIGUEIRA DA FOZ':'VG Collection Figueira da Foz','COLLECTION BRAGA':'VG Collection Braga','DOURO VINEYARDS':'VG Douro Vineyards','COLLECTION DOURO':'VG Collection Douro','COLLECTION SERRA DA ESTRELA':'VG Serra da Estrela','COIMBRA':'VG Coimbra','COLLECTION TOMAR':'VG Tomar','COLLECTION SINTRA':'VG Sintra','ERICEIRA':'VG Ericeira','CASCAIS':'VG Cascais','COLLECTION PALACIO DOS ARCOS':'VG Collection Palácio dos Arcos','SANTA CRUZ':'VG Santa Cruz','ESTORIL':'VG Estoril','CASAS DE ELVAS':"VG Casas d'Elvas",'COLLECTION ELVAS':'VG Collection Elvas','COLLECTION ALTER REAL':'VG Collection Alter Real','EVORA':'VG Évora','COLLECTION MONTE DO VILAR':'VG Monte do Vilar','ALENTEJO VINEYARDS':'VG Alentejo Vineyards','TAVIRA':'VG Tavira','NEP KIDS':'VG NEP Kids','MARINA':'VG Marina','ALBACORA':'VG Albacora','COLLECTION PRAIA':'VG Collection Praia','AMPALIUS':'VG Ampalius','CERRO ALAGOA':'VG Cerro Alagoa','ATLANTICO':'VG Atlântico','NAUTICO':'VG Náutico','LAGOS':'VG Lagos','COLLECTION S. MIGUEL':'VG S Miguel','COLLECTION PONTE DE LIMA VINEYARDS':'VGC PONTE DE LIMA VINEYARDS'};
  const k=MAP[hotel]||hotel;
  return(typeof HOTEIS_XLSX!=='undefined'&&HOTEIS_XLSX[k]?.totalQ)||null;
}

function orcCalc(hotel,mesPrev){
  const yr=String(YR_CUR),yrp=String(YR_PREV);
  const dias=ORC_DIAS_MES[mesPrev];
  const fCen=ORC_CENARIO_FACTOR[ORC_STATE.cenario];
  const fCost=ORC_CENARIO_COST_FACTOR[ORC_STATE.cenario];
  const mesesReal=Object.keys(STORE).map(Number).sort((a,b)=>a-b);
  const ultimoMes=mesesReal[mesesReal.length-1]||0;

  // Um mês é "real" apenas se tiver dados reais do ano atual; previsões sintéticas nunca contam como real
  const hasDataCurrent = orcHasRealCurrentData(hotel, mesPrev);

  if(hasDataCurrent){
    const d=STORE[mesPrev],ops=d.hotels_ops?.[hotel],costs=d.hotels_costs?.[hotel];
    return{real:true,mes:mesPrev,
      occ26:ops?(n(ops.Ocupados?.[yr])/n(ops.Disponiveis?.[yr])*100):null,
      occ25:ops?(n(ops.Ocupados?.[yrp])/n(ops.Disponiveis?.[yrp])*100):null,
      recAloj26:ops?n(ops['Receita Alojamento']?.[yr]):null,recAloj25:ops?n(ops['Receita Alojamento']?.[yrp]):null,
      recFB26:ops?n(ops['Receita FB']?.[yr]):null,recFB25:ops?n(ops['Receita FB']?.[yrp]):null,
      recTotal26:ops?n(ops['Receita Total']?.[yr]):null,recTotal25:ops?n(ops['Receita Total']?.[yrp]):null,
      custos26:costs?n(costs.TOTAIS?.[yr]):null,custos25:costs?n(costs.TOTAIS?.[yrp]):null,
      pessoal25:costs?n(costs.PESSOAL?.[yrp]):null,pessoal26:costs?n(costs.PESSOAL?.[yr]):null,
      energia25:costs?n(costs.ENERGIA?.[yrp]):null,energia26:costs?n(costs.ENERGIA?.[yr]):null,
      comidas25:costs?n(costs.COMIDAS?.[yrp]):null,comidas26:costs?n(costs.COMIDAS?.[yr]):null,
      bebidas25:costs?n(costs.BEBIDAS?.[yrp]):null,bebidas26:costs?n(costs.BEBIDAS?.[yr]):null,
      manutencao25:costs?n(costs['MANUTENÇÃO']?.[yrp]):null,manutencao26:costs?n(costs['MANUTENÇÃO']?.[yr]):null,
      operacionais25:costs?n(costs.OPERACIONAIS?.[yrp]):null,operacionais26:costs?n(costs.OPERACIONAIS?.[yr]):null,
      gop26:ops?gop(hotel,yr,d):null,
      gop25:ops?gop(hotel,yrp,d):null,
      adr26:adrOficial(hotel,yr,d),adr25:adrOficial(hotel,yrp,d),
      quartos:occQuartosHotel(hotel),dias};
  }

  // Regra fixa: Julho a Dezembro usam ano anterior como base (+5% receitas, +8% custos)
  if (orcIsFixedBudgetMonth(mesPrev)) {
    const d = STORE[mesPrev];
    const ops = d?.hotels_ops?.[hotel];
    const costs = d?.hotels_costs?.[hotel];
    const raMes25 = n(ops?.['Receita Alojamento']?.[yrp]);
    const rfbMes25 = n(ops?.['Receita FB']?.[yrp]);
    const recTotalBase25 = n(ops?.['Receita Total']?.[yrp]) || (raMes25 + rfbMes25);
    const psMes25 = n(costs?.PESSOAL?.[yrp]);
    const enMes25 = n(costs?.ENERGIA?.[yrp]);
    const coMes25 = n(costs?.COMIDAS?.[yrp]);
    const beMes25 = n(costs?.BEBIDAS?.[yrp]);
    const maMes25 = n(costs?.['MANUTENÇÃO']?.[yrp]);
    const opMes25 = n(costs?.OPERACIONAIS?.[yrp]);
    const ctMes25 = n(costs?.TOTAIS?.[yrp]) || (psMes25 + enMes25 + coMes25 + beMes25 + maMes25 + opMes25);
    const occ25Occ = n(ops?.Ocupados?.[yrp]);
    const occ25Disp = n(ops?.Disponiveis?.[yrp]);
    const recAloj26 = raMes25 * ORC_REVENUE_FACTOR;
    const recFB26 = rfbMes25 * ORC_REVENUE_FACTOR;
    const recTotal26 = recTotalBase25 * ORC_REVENUE_FACTOR;
    const custos26 = ctMes25 * ORC_COST_FACTOR;
    return {real:false,mes:mesPrev,cenario:'fixo',fixedBudget:true,
      occ25:occ25Disp>0?occ25Occ/occ25Disp*100:null,occ26:null,
      recAloj25:raMes25,recAloj26,recFB25:rfbMes25,recFB26,
      recTotal25:recTotalBase25,recTotal26,
      custos25:ctMes25,custos26,
      pessoal25:psMes25,pessoal26:psMes25*ORC_COST_FACTOR,
      energia25:enMes25,energia26:enMes25*ORC_COST_FACTOR,
      comidas25:coMes25,comidas26:coMes25*ORC_COST_FACTOR,
      bebidas25:beMes25,bebidas26:beMes25*ORC_COST_FACTOR,
      manutencao25:maMes25,manutencao26:maMes25*ORC_COST_FACTOR,
      operacionais25:opMes25,operacionais26:opMes25*ORC_COST_FACTOR,
      gop25:recTotalBase25-ctMes25,gop26:recTotal26-custos26,
      adr25:adrOficial(hotel,yrp,d),adr26:null,
      quartos:occQuartosHotel(hotel),dias,
      factorAloj:ORC_REVENUE_FACTOR,factorFB:ORC_REVENUE_FACTOR,factorCust:ORC_COST_FACTOR,pesoAloj:null,pickupOcc:null};
  }

  // Sazonalidade do ano anterior — usa TODOS os meses do STORE que têm dados do ano anterior
  // (inclui meses futuros do ano atual que só têm histórico 2025)
  let raA25=0,raMes25=0,rfbA25=0,rfbMes25=0,ctA25=0,ctMes25=0;
  let psA25=0,psMes25=0,enA25=0,enMes25=0,coA25=0,coMes25=0;
  let beA25=0,beMes25=0,maA25=0,maMes25=0,opA25=0,opMes25=0;
  let occ25Occ=0,occ25Disp=0,adr25Sum=0,adr25Cnt=0;
  for(let m=1;m<=12;m++){
    const d=STORE[m];if(!d)continue;
    const ops=d.hotels_ops?.[hotel],costs=d.hotels_costs?.[hotel];if(!ops)continue;
    // Usa dados do ano anterior (existem mesmo em meses ainda sem 2026)
    const ra=n(ops['Receita Alojamento']?.[yrp]),rfb=n(ops['Receita FB']?.[yrp]);
    if(ra===0&&rfb===0)continue; // sem dados do ano anterior para este mês
    const ct=n(costs?.TOTAIS?.[yrp]),ps=n(costs?.PESSOAL?.[yrp]),en=n(costs?.ENERGIA?.[yrp]);
    const co=n(costs?.COMIDAS?.[yrp]),be=n(costs?.BEBIDAS?.[yrp]);
    const ma=n(costs?.['MANUTENÇÃO']?.[yrp]),op=n(costs?.OPERACIONAIS?.[yrp]);
    raA25+=ra;rfbA25+=rfb;ctA25+=ct;psA25+=ps;enA25+=en;coA25+=co;beA25+=be;maA25+=ma;opA25+=op;
    if(m===mesPrev){raMes25=ra;rfbMes25=rfb;ctMes25=ct;psMes25=ps;enMes25=en;coMes25=co;beMes25=be;maMes25=ma;opMes25=op;
      occ25Occ=n(ops.Ocupados?.[yrp]);occ25Disp=n(ops.Disponiveis?.[yrp]);
      const av=adrOficial(hotel,yrp,d);if(av){adr25Sum+=av;adr25Cnt++;}}
  }
  const pA=raA25>0?raMes25/raA25:1/12,pFB=rfbA25>0?rfbMes25/rfbA25:1/12;
  const pC=ctA25>0?ctMes25/ctA25:1/12,pPs=psA25>0?psMes25/psA25:1/12;
  const pEn=enA25>0?enMes25/enA25:1/12,pCo=coA25>0?coMes25/coA25:1/12;
  const pBe=beA25>0?beMes25/beA25:1/12,pMa=maA25>0?maMes25/maA25:1/12;
  const pOp=opA25>0?opMes25/opA25:1/12;

  // Tendência YoY
  let tA=0,tFB=0,tC=0,tN=0;
  for(let m of mesesReal){
    const d=STORE[m];if(!d)continue;
    const ops=d.hotels_ops?.[hotel],costs=d.hotels_costs?.[hotel];if(!ops)continue;
    const ra26=n(ops['Receita Alojamento']?.[yr]),ra25=n(ops['Receita Alojamento']?.[yrp]);
    const rfb26=n(ops['Receita FB']?.[yr]),rfb25=n(ops['Receita FB']?.[yrp]);
    const ct26=n(costs?.TOTAIS?.[yr]),ct25=n(costs?.TOTAIS?.[yrp]);
    if(ra25>0)tA+=ra26/ra25;if(rfb25>0)tFB+=rfb26/rfb25;if(ct25>0)tC+=ct26/ct25;tN++;
  }
  const fA=tN>0?tA/tN:1,fFB=tN>0?tFB/tN:1,fC=tN>0?tC/tN:1;

  let baseRA=raA25*pA*fA,baseRFB=rfbA25*pFB*fFB;

  // Ajuste pickup: usa OTB do snapshot de ocupação se disponível, senão usa input manual
  let pu=ORC_STATE.pickupOcc;
  // Tentar ler OTB do snapshot de ocupação para o mês em questão
  if(pu==null&&typeof OCC_SNAPSHOTS!=='undefined'&&OCC_SNAPSHOTS.length>0){
    // Último snapshot disponível — procurar valor de ocupação para o hotel e mês
    const lastSnap=OCC_SNAPSHOTS[OCC_SNAPSHOTS.length-1];
    const snapVal=lastSnap?.data?.[hotel]?.[yr];
    // O snapshot mostra ocupação YTD acumulada — não serve directamente para o mês futuro
    // Usar ocupação do mesmo mês do ano anterior como proxy base, ajustada pela tendência OTB
    // (OTB já está no pickup manual se o utilizador o introduzir)
  }

  if(pu!=null&&pu>0){
    const q=occQuartosHotel(hotel);
    if(q){
      const pot=q*dias;
      const occ25p=occ25Disp>0?occ25Occ/occ25Disp:0.5;
      const adrPrev=adr25Cnt>0?(adr25Sum/adr25Cnt)*fA:baseRA/(occ25Occ||1);
      const occFin=Math.max(pu/100,occ25p*0.5+pu/100*0.5);
      baseRA=occFin*pot*adrPrev;
    }
  }

  const rA=baseRA*fCen,rFB=baseRFB*fCen,rT=rA+rFB;
  const baseMes=rA+rFB,baseMes25=raMes25+rfbMes25;
  const ps26=(psA25*pPs*fC)*fCost;
  const en26=(enA25*pEn*fC)*fCost;
  const co26=rFB*(rfbA25>0?coA25*pCo/(rfbA25*pFB):0.28)*fCost;
  const be26=rFB*(rfbA25>0?beA25*pBe/(rfbA25*pFB):0.07)*fCost;
  const ma26=(maA25*pMa*fC)*fCost;
  const op26=(opA25*pOp*fC)*fCost;
  const ct26=ps26+en26+co26+be26+ma26+op26;

  return{real:false,mes:mesPrev,cenario:ORC_STATE.cenario,
    occ25:occ25Disp>0?occ25Occ/occ25Disp*100:null,occ26:null,
    recAloj25:raMes25,recAloj26:rA,recFB25:rfbMes25,recFB26:rFB,
    recTotal25:raMes25+rfbMes25,recTotal26:rT,
    custos25:ctMes25,custos26:ct26,
    pessoal25:psMes25,pessoal26:ps26,energia25:enMes25,energia26:en26,
    comidas25:coMes25,comidas26:co26,bebidas25:beMes25,bebidas26:be26,
    manutencao25:maMes25,manutencao26:ma26,operacionais25:opMes25,operacionais26:op26,
    gop25:raMes25+rfbMes25-ctMes25,gop26:rT-ct26,
    adr25:adr25Cnt>0?adr25Sum/adr25Cnt:null,adr26:adr25Cnt>0?(adr25Sum/adr25Cnt)*fA:null,
    quartos:occQuartosHotel(hotel),dias,factorAloj:fA,factorFB:fFB,factorCust:fC,pesoAloj:pA,pickupOcc:pu};
}

function orcFmtK(v){
  if(v==null||isNaN(v))return'—';
  const abs=Math.abs(v),sign=v<0?'-':'';
  if(abs>=1e6)return sign+'€'+fmt(abs/1e6,abs>=10e6?1:2)+'M';
  if(abs>=1e3)return sign+'€'+fmt(abs/1e3,0)+'K';
  return sign+'€'+fmt(abs,0);
}

function orcRender(){
  const el=document.getElementById('main-content');if(!el)return;
  const hotels=getActiveHotels();
  const realizados=Object.keys(STORE).map(Number).sort((a,b)=>a-b);
  const ultimoMes=orcUltimoMesRealCurrent(null)||5;
  const mesPrev=ORC_STATE.mesPrev||Math.min(Math.max(ultimoMes+1, ORC_FIXED_START_MONTH),12);
  ORC_STATE.mesPrev=mesPrev;
  if(!ORC_STATE.hotel||!hotels.includes(ORC_STATE.hotel))ORC_STATE.hotel=hotels[0];

  el.innerHTML=`<div style="padding:20px;max-width:1400px">
  <div style="margin-bottom:18px">
    <h2 style="color:var(--gold);font-size:18px;font-weight:700;margin-bottom:4px">📋 Orçamento Previsional</h2>
    <p style="color:var(--text-3);font-size:12px">Orçamento por hotel: meses reais mantidos; de julho a dezembro usa ${YR_PREV} como base, com +5% nas receitas e +8% nos custos.</p>
  </div>
  <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:20px;background:var(--surface-1);padding:14px 16px;border-radius:10px;border:1px solid var(--border)">
    <div>
      <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Hotel</div>
      <select id="orcHotel" style="background:var(--surface-2);color:var(--text-1);border:1px solid var(--border);border-radius:6px;padding:7px 10px;font-size:13px;min-width:200px">
        ${hotels.map(h=>`<option value="${h}"${h===ORC_STATE.hotel?' selected':''}>${h}</option>`).join('')}
      </select>
    </div>
    <div>
      <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Mês a prever</div>
      <select id="orcMes" style="background:var(--surface-2);color:var(--text-1);border:1px solid var(--border);border-radius:6px;padding:7px 10px;font-size:13px">
        ${Array.from({length:12},(_,i)=>i+1).map(m=>`<option value="${m}"${m===mesPrev?' selected':''}>${ORC_MESES_NOMES[m]}</option>`).join('')}
      </select>
    </div>
    <div>
      <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Cenário</div>
      <div style="display:flex;gap:4px">
        ${['pessimista','base','optimista'].map(c=>`<button onclick="orcSetCenario('${c}')" style="padding:7px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:${ORC_STATE.cenario===c?'var(--gold)':'var(--surface-2)'};color:${ORC_STATE.cenario===c?'#fff':'var(--text-2)'}">${c==='pessimista'?'📉 Pess.':c==='base'?'📊 Base':'📈 Opt.'}</button>`).join('')}
      </div>
    </div>
    <div>
      <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Pickup occ % (opcional)</div>
      <input type="number" id="orcPickup" min="0" max="100" step="1" placeholder="Ex: 45" value="${ORC_STATE.pickupOcc??''}"
        style="background:var(--surface-2);color:var(--text-1);border:1px solid var(--border);border-radius:6px;padding:7px 10px;font-size:13px;width:110px">
    </div>
    <button onclick="orcApply()" style="padding:8px 18px;background:var(--gold);color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer">Calcular</button>
    <button onclick="orcExport()" style="padding:8px 14px;background:var(--surface-2);color:var(--text-2);border:1px solid var(--border);border-radius:6px;font-size:12px;cursor:pointer">📥 Exportar Excel</button>
  </div>
  <div id="orcResult"></div>
  <div style="margin-top:28px">
    <h3 style="color:var(--text-2);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Visão Anual — ${ORC_STATE.hotel}</h3>
    <div id="orcAnual"></div>
  </div>
</div>`;

  document.getElementById('orcHotel').onchange=e=>{ORC_STATE.hotel=e.target.value;orcRenderResult();orcRenderAnual();};
  document.getElementById('orcMes').onchange=e=>{ORC_STATE.mesPrev=+e.target.value;orcRenderResult();};
  orcRenderResult();orcRenderAnual();
}

function orcSetCenario(c){ORC_STATE.cenario=c;orcRender();}

function orcApply(){
  const p=document.getElementById('orcPickup')?.value;
  ORC_STATE.pickupOcc=p&&p!==''?Math.max(0,Math.min(100,+p)):null;
  ORC_STATE.hotel=document.getElementById('orcHotel')?.value||ORC_STATE.hotel;
  ORC_STATE.mesPrev=+(document.getElementById('orcMes')?.value)||ORC_STATE.mesPrev;
  orcRenderResult();orcRenderAnual();
}

function orcRow(label,v25,v26,isGood){
  const vr=v25&&v25!==0?(v26-v25)/Math.abs(v25)*100:null;
  const cls=vr==null?'var(--text-3)':((isGood?vr>=0:vr<=0)?'var(--pos)':'var(--neg)');
  return`<tr><td style="padding:8px 12px;font-size:12px;color:var(--text-2)">${label}</td>
    <td style="text-align:right;padding:8px 12px;font-size:12px">${v25!=null?orcFmtK(v25):'—'}</td>
    <td style="text-align:right;padding:8px 12px;font-size:12px;font-weight:700;color:var(--gold)">${orcFmtK(v26)}</td>
    <td style="text-align:right;padding:8px 12px;font-size:11px;color:${cls}">${vr!=null?(vr>=0?'+':'')+fmt(vr,1)+'%':'—'}</td></tr>`;
}

function orcRenderResult(){
  const el=document.getElementById('orcResult');if(!el||!ORC_STATE.hotel||!ORC_STATE.mesPrev)return;
  // Verificar se há dados do ano anterior para o mês
  const d25=STORE[ORC_STATE.mesPrev];
  const ops25=d25?.hotels_ops?.[ORC_STATE.hotel];
  const temDados25 = ops25 && (n(ops25['Receita Alojamento']?.[String(YR_PREV)])>0 || n(ops25['Receita Total']?.[String(YR_PREV)])>0);
  if(!temDados25 && !d25){
    el.innerHTML=`<div style="background:var(--surface-1);border:1px solid var(--border);border-radius:12px;padding:24px;text-align:center">
      <div style="font-size:32px;margin-bottom:12px">📂</div>
      <div style="font-size:14px;font-weight:700;color:var(--text-1);margin-bottom:8px">Dados de ${ORC_MESES_NOMES[ORC_STATE.mesPrev]} ${YR_PREV} não carregados</div>
      <div style="font-size:12px;color:var(--text-3)">Para prever ${ORC_MESES_NOMES[ORC_STATE.mesPrev]} ${YR_CUR}, carrega o ficheiro P&L de ${ORC_MESES_NOMES[ORC_STATE.mesPrev]} ${YR_PREV} em <b>Carregar Docs → Carregar Excel P&L</b>.</div>
    </div>`;
    return;
  }
  const d=orcCalc(ORC_STATE.hotel,ORC_STATE.mesPrev);
  const isReal=d.real;
  const badge=isReal?'<span style="background:#166534;color:#bbf7d0;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">✓ Dados reais</span>':(d.fixedBudget?('<span style="background:rgba(251,191,36,.15);color:var(--gold);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">▶ Orçamento fixo '+YR_PREV+' +5/+8</span>'):`<span style="background:rgba(251,191,36,.15);color:var(--gold);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">▶ Previsão ${d.cenario}</span>`);
  const occ26str=d.occ26!=null?fmt(d.occ26,1)+'%':(d.pickupOcc!=null?'≥'+fmt(d.pickupOcc,1)+'% pickup':'—');
  const kpis=[['Receita Total',orcFmtK(d.recTotal26),d.recTotal25?orcFmtK(d.recTotal25):'—'],['Rec. Alojamento',orcFmtK(d.recAloj26),d.recAloj25?orcFmtK(d.recAloj25):'—'],['Rec. F&B',orcFmtK(d.recFB26),d.recFB25?orcFmtK(d.recFB25):'—'],['Custos Totais',orcFmtK(d.custos26),d.custos25?orcFmtK(d.custos25):'—'],['GOP',orcFmtK(d.gop26),d.gop25!=null?orcFmtK(d.gop25):'—'],['Occ prev/real',occ26str,d.occ25!=null?fmt(d.occ25,1)+'%':'—']];
  el.innerHTML=`<div style="background:var(--surface-1);border:1px solid var(--border);border-radius:12px;padding:20px">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
    <h3 style="color:var(--text-1);font-size:16px;font-weight:700;margin:0">${ORC_STATE.hotel} — ${ORC_MESES_NOMES[d.mes]} ${YR_CUR}</h3>${badge}
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:10px;margin-bottom:20px">
    ${kpis.map(([l,v,v25])=>`<div style="background:var(--surface-2);border-radius:8px;padding:12px 14px;border-left:3px solid var(--gold)"><div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">${l}</div><div style="font-size:18px;font-weight:700;color:var(--gold)">${v}</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">${YR_PREV}: ${v25}</div></div>`).join('')}
  </div>
  <table style="width:100%;border-collapse:collapse">
  <thead><tr style="background:var(--surface-3)"><th style="text-align:left;padding:9px 12px;font-size:11px;color:var(--text-3);font-weight:600;text-transform:uppercase;letter-spacing:1px">Rubrica</th><th style="text-align:right;padding:9px 12px;font-size:11px;color:var(--text-3);font-weight:600">${YR_PREV} Real</th><th style="text-align:right;padding:9px 12px;font-size:11px;color:var(--gold);font-weight:600">${isReal?YR_CUR+' Real':YR_CUR+' Previsto'}</th><th style="text-align:right;padding:9px 12px;font-size:11px;color:var(--text-3);font-weight:600">Variação</th></tr></thead>
  <tbody>
  <tr style="background:var(--surface-0)"><td colspan="4" style="padding:6px 12px;font-size:10px;color:var(--text-3);font-weight:700;text-transform:uppercase;letter-spacing:1px">RECEITAS</td></tr>
  ${orcRow('Receita Alojamento',d.recAloj25,d.recAloj26,true)}
  ${orcRow('Receita F&B',d.recFB25,d.recFB26,true)}
  ${orcRow('RECEITA TOTAL',d.recTotal25,d.recTotal26,true)}
  <tr style="background:var(--surface-0)"><td colspan="4" style="padding:6px 12px;font-size:10px;color:var(--text-3);font-weight:700;text-transform:uppercase;letter-spacing:1px">CUSTOS</td></tr>
  ${orcRow('Pessoal',d.pessoal25,d.pessoal26,false)}
  ${orcRow('Energia',d.energia25,d.energia26,false)}
  ${orcRow('Comidas',d.comidas25,d.comidas26,false)}
  ${orcRow('Bebidas',d.bebidas25,d.bebidas26,false)}
  ${orcRow('Manutenção',d.manutencao25,d.manutencao26,false)}
  ${orcRow('Operacionais',d.operacionais25,d.operacionais26,false)}
  ${orcRow('CUSTOS TOTAIS',d.custos25,d.custos26,false)}
  <tr style="background:var(--surface-0)"><td colspan="4" style="padding:6px 12px;font-size:10px;color:var(--text-3);font-weight:700;text-transform:uppercase;letter-spacing:1px">RESULTADO</td></tr>
  <tr style="font-weight:700"><td style="padding:10px 12px;font-size:13px;color:var(--text-1)">GOP</td><td style="text-align:right;padding:10px 12px;font-size:13px">${d.gop25!=null?orcFmtK(d.gop25):'—'}</td><td style="text-align:right;padding:10px 12px;font-size:13px;color:${(d.gop26||0)>=0?'var(--pos)':'var(--neg)'}">${orcFmtK(d.gop26)}</td><td style="text-align:right;padding:10px 12px;font-size:12px;color:${d.gop25&&d.gop25!==0?((d.gop26-d.gop25)/Math.abs(d.gop25)>=0?'var(--pos)':'var(--neg)'):'var(--text-3)'}">
    ${d.gop25&&d.gop25!==0?((d.gop26-d.gop25)/Math.abs(d.gop25)>=0?'+':'')+fmt((d.gop26-d.gop25)/Math.abs(d.gop25)*100,1)+'%':'—'}</td></tr>
  ${!isReal?`<tr><td colspan="4" style="padding:8px 12px;font-size:11px;color:var(--text-3);border-top:1px solid var(--border)">${d.fixedBudget?('ℹ Regra aplicada: receitas '+YR_PREV+' × 1,05 | custos '+YR_PREV+' × 1,08. Cenário e pickup não alteram julho-dezembro.'):'ℹ Tendência YoY: Receitas ×'+fmt(d.factorAloj,2)+' | Custos ×'+fmt(d.factorCust,2)+' | Sazonalidade mês: '+fmt(d.pesoAloj*100,1)+'% da receita anual'+(d.pickupOcc!=null?' | Pickup: '+fmt(d.pickupOcc,1)+'%':'')}</td></tr>`:''}
  </tbody></table></div>`;
}

function orcRenderAnual(){
  const el=document.getElementById('orcAnual');if(!el||!ORC_STATE.hotel)return;
  const realizados=Object.keys(STORE).map(Number);
  const ultimoMes=Math.max(0,...realizados);
  const rows=Array.from({length:12},(_,i)=>i+1).map(m=>{
    const d=orcCalc(ORC_STATE.hotel,m);
    const isReal=!!d.real;
    const vR=d.recTotal25>0?(d.recTotal26-d.recTotal25)/d.recTotal25*100:null;
    const vG=d.gop25&&d.gop25!==0?(d.gop26-d.gop25)/Math.abs(d.gop25)*100:null;
    return`<tr style="background:${isReal?'var(--surface-1)':'var(--surface-0)'}">
      <td style="font-weight:600;padding:8px 10px;font-size:12px;color:${isReal?'var(--text-1)':'var(--gold)'}">${ORC_MESES_NOMES[m]} ${isReal?'<span style="font-size:10px;color:var(--text-3)">(real)</span>':'<span style="font-size:10px;color:var(--gold)">▶</span>'}</td>
      <td style="text-align:right;padding:8px 10px;font-size:12px">${d.occ25!=null?fmt(d.occ25,1)+'%':'—'}</td>
      <td style="text-align:right;padding:8px 10px;font-size:12px">${d.recTotal25>0?orcFmtK(d.recTotal25):'—'}</td>
      <td style="text-align:right;padding:8px 10px;font-size:12px;font-weight:700;color:var(--gold)">${orcFmtK(d.recTotal26)}</td>
      <td style="text-align:right;padding:8px 10px;font-size:12px;color:${vR==null?'var(--text-3)':vR>=0?'var(--pos)':'var(--neg)'}">${vR!=null?(vR>=0?'+':'')+fmt(vR,1)+'%':'—'}</td>
      <td style="text-align:right;padding:8px 10px;font-size:12px">${d.gop25!=null?orcFmtK(d.gop25):'—'}</td>
      <td style="text-align:right;padding:8px 10px;font-size:12px;font-weight:700;color:${(d.gop26||0)>=0?'var(--pos)':'var(--neg)'}">${orcFmtK(d.gop26)}</td>
      <td style="text-align:right;padding:8px 10px;font-size:12px;color:${vG==null?'var(--text-3)':vG>=0?'var(--pos)':'var(--neg)'}">${vG!=null?(vG>=0?'+':'')+fmt(vG,1)+'%':'—'}</td>
    </tr>`;
  }).join('');
  let tR25=0,tR26=0,tG25=0,tG26=0;
  for(let m=1;m<=12;m++){const d=orcCalc(ORC_STATE.hotel,m);tR25+=d.recTotal25||0;tR26+=d.recTotal26||0;tG25+=d.gop25||0;tG26+=d.gop26||0;}
  const tvR=tR25>0?(tR26-tR25)/tR25*100:null,tvG=tG25!==0?(tG26-tG25)/Math.abs(tG25)*100:null;
  el.innerHTML=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
<thead><tr style="background:var(--surface-3)">
  <th style="text-align:left;padding:8px 10px;color:var(--text-3);font-weight:600">Mês</th>
  <th style="text-align:right;padding:8px 10px;color:var(--text-3);font-weight:600">Occ ${YR_PREV}</th>
  <th style="text-align:right;padding:8px 10px;color:var(--text-3);font-weight:600">Rec ${YR_PREV}</th>
  <th style="text-align:right;padding:8px 10px;color:var(--gold);font-weight:600">Rec Prev/Real</th>
  <th style="text-align:right;padding:8px 10px;color:var(--text-3);font-weight:600">Var %</th>
  <th style="text-align:right;padding:8px 10px;color:var(--text-3);font-weight:600">GOP ${YR_PREV}</th>
  <th style="text-align:right;padding:8px 10px;color:var(--gold);font-weight:600">GOP Prev/Real</th>
  <th style="text-align:right;padding:8px 10px;color:var(--text-3);font-weight:600">Var %</th>
</tr></thead>
<tbody>${rows}</tbody>
<tfoot><tr style="background:var(--surface-3);font-weight:700;border-top:2px solid var(--border)">
  <td style="padding:10px;font-size:13px">TOTAL ANUAL</td><td></td>
  <td style="text-align:right;padding:10px">${orcFmtK(tR25)}</td>
  <td style="text-align:right;padding:10px;color:var(--gold)">${orcFmtK(tR26)}</td>
  <td style="text-align:right;padding:10px;color:${tvR==null?'inherit':tvR>=0?'var(--pos)':'var(--neg)'}">${tvR!=null?(tvR>=0?'+':'')+fmt(tvR,1)+'%':'—'}</td>
  <td style="text-align:right;padding:10px">${orcFmtK(tG25)}</td>
  <td style="text-align:right;padding:10px;color:${tG26>=0?'var(--pos)':'var(--neg)'}">${orcFmtK(tG26)}</td>
  <td style="text-align:right;padding:10px;color:${tvG==null?'inherit':tvG>=0?'var(--pos)':'var(--neg)'}">${tvG!=null?(tvG>=0?'+':'')+fmt(tvG,1)+'%':'—'}</td>
</tr></tfoot></table></div>`;
}

async function orcExport(){
  if(!ORC_STATE.hotel)return;
  try { if(window.VG?.performance?.ensureXLSX) await window.VG.performance.ensureXLSX(); } catch(e) { if(typeof showToast==='function')showToast('Não foi possível carregar a biblioteca Excel: '+(e.message||e),true); return; }
  const hotel=ORC_STATE.hotel;
  const wb=XLSX.utils.book_new();
  const realizados=Object.keys(STORE).map(Number);
  const ultimoMes=Math.max(0,...realizados);
  const headers=['Mês','Tipo','Occ '+YR_PREV+' %','Rec Aloj '+YR_PREV,'Rec Aloj Prev','Rec FB '+YR_PREV,'Rec FB Prev','Rec Total '+YR_PREV,'Rec Total Prev','Custos '+YR_PREV,'Custos Prev','Pessoal Prev','Energia Prev','Comidas Prev','Bebidas Prev','Manut Prev','Operac Prev','GOP '+YR_PREV,'GOP Prev','Var Rec %','Var GOP %'];
  const rows=[headers];
  for(let m=1;m<=12;m++){
    const d=orcCalc(hotel,m);
    const tipo=d.real?'Real':(d.fixedBudget?'Orçamento fixo '+YR_PREV+' +5/+8':'Previsto');
    const vR=d.recTotal25>0?+((d.recTotal26-d.recTotal25)/d.recTotal25*100).toFixed(1):'';
    const vG=d.gop25&&d.gop25!==0?+((d.gop26-d.gop25)/Math.abs(d.gop25)*100).toFixed(1):'';
    rows.push([ORC_MESES_NOMES[m],tipo,d.occ25!=null?+fmt(d.occ25,1):null,d.recAloj25,d.recAloj26,d.recFB25,d.recFB26,d.recTotal25,d.recTotal26,d.custos25,d.custos26,d.pessoal26,d.energia26,d.comidas26,d.bebidas26,d.manutencao26,d.operacionais26,d.gop25,d.gop26,vR,vG]);
  }
  const ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=headers.map((_,i)=>({wch:i===0?14:i===1?10:14}));
  XLSX.utils.book_append_sheet(wb,ws,hotel.substring(0,31));
  XLSX.writeFile(wb,`Orcamento_${hotel.replace(/[^a-z0-9]/gi,'_')}_${YR_CUR}.xlsx`);
  if(typeof showToast==='function')showToast(`✓ Orçamento exportado — ${hotel}`);
}

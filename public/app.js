let allDataStore = {};

const allDates = (() => {
  const ret = [];
  const day = new Date('2020-01-24T00:00:00+08:00');
  const now = new Date();
  while (day <= now) {
    ret.push(day.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }).replace(/\/?2020\/?/, ''));
    day.setHours(day.getHours() + 24);
  }
  return ret;
})();

let chartsContainerId = 'chart_container';
let allCharts = [];

async function getData(type) {
  if (!allDataStore[type]) {
    const ret = await axios(`by_${type}.json`);
    allDataStore[type] = ret.data;
  }

  return allDataStore[type];
}

function shortAreaName(name) {
  return name.replace(/(区|省|市|自治区|壮|回|族|维吾尔)/g, '');
}

function createTrendsChartConfig(data) {
  const { name, records } = data;
  const hasCity = !!data.cityList;
  const days = records.map(v => v.updateTime);
  const confirmed = records.map(v => v.confirmedCount);
  const increase = records.map(v => v.confirmedIncreased);
  const cured = records.map(v => v.curedCount);
  const curedIncrease = records.map(v => v.curedIncreased);
  const dead = records.map(v => v.deadCount);
  const deadIncrease = records.map(v => v.deadIncreased);
  const insick = records.map(v => v.insickCount);

  const config = {
    title: {
      text: name,
      link: hasCity ? `javascript:showProvince('${name}')` : '',
      target: 'self',
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: [ '确诊', '治愈', '死亡', '治疗', '新增确诊', '新增治愈', '新增死亡' ],
      textStyle: {
        fontSize: 9,
      }
    },
    xAxis: {
        type: 'category',
        data: days,
    },
    yAxis: [
      {
        type: 'value',
      },
      {
        type: 'value',
      },
    ],
    series: [
      {
        name: '确诊',
        data: confirmed,
        type: 'line',
      },
      {
        name: '治愈',
        data: cured,
        type: 'line',
      },
      {
        name: '死亡',
        data: dead,
        type: 'line',
      },
      {
        name: '治疗',
        data: insick,
        type: 'line',
      },
      {
        name: '新增确诊',
        data: increase,
        type: 'bar',
        yAxisIndex: 1,
      },
      {
        name: '新增治愈',
        data: curedIncrease,
        type: 'bar',
        yAxisIndex: 1,
      },
      {
        name: '新增死亡',
        data: deadIncrease,
        type: 'bar',
        yAxisIndex: 1,
      },
    ]
  };

  return config;
}

async function createMapChartConfig({ mapName, data, title = '', valueKey = 'confirmedCount' }) {
  let geoJSON = null;
  if (!echarts.getMap(mapName)) {
    geoJSON = (await axios(`map/json/${mapName.substr(0, 5) !== 'china' ? 'province/' : ''}${mapName}.json`)).data;
    echarts.registerMap(mapName, geoJSON);
  } else {
    geoJSON = echarts.getMap(mapName).geoJson;
  }
  geoJSON.features.forEach(v => {
    const showName = v.properties.name;
    data.forEach(d => {
      d.records.forEach(r => {
        const name = r.name;
        if (name.substr(0, showName.length) === showName || showName.substr(0, name.length) === name) {
          r.showName = showName;
        }
      });
    })
  });

  const visualPieces = mapName === 'china' ? [
    { min: 10000, label: '10000人及以上', color: 'rgb(143,31,25)' },
    { min: 1000, max: 9999, label: '1000-9999人', color: 'rgb(185,43,35)' },
    { min: 500, max: 999, label: '500-999人', color: 'rgb(213,86,78)' },
    { min: 100, max: 499, label: '100-499人', color: 'rgb(239,140,108)' },
    { min: 10, max: 99, label: '10-99人', color: 'rgb(248,211,166)' },
    { min: 1, max: 9, label: '1-9人', color: 'rgb(252,239,218)' },
  ] : [
    { min: 1000, label: '1000人及以上', color: 'rgb(143,31,25)' },
    { min: 500, max: 999, label: '500-999人', color: 'rgb(185,43,35)' },
    { min: 100, max: 499, label: '100-499人', color: 'rgb(213,86,78)' },
    { min: 50, max: 100, label: '50-99人', color: 'rgb(239,140,108)' },
    { min: 10, max: 49, label: '10-49人', color: 'rgb(248,211,166)' },
    { min: 1, max: 9, label: '1-9人', color: 'rgb(252,239,218)' },
  ];

  const config = {
    baseOption: {
      timeline: {
          axisType: 'category',
          // realtime: false,
          // loop: false,
          autoPlay: false,
          currentIndex: data.length - 1,
          playInterval: 1000,
          // controlStyle: {
          //     position: 'left'
          // },
          data: data.map(d => d.day),
      },
      tooltip: {
        show: true,
        trigger: 'item',
      },
      // toolbox: {
      //   show: true,
      //   orient: 'vertical',
      //   left: 'right',
      //   top: 'center',
      //   feature: {
      //     dataView: {readOnly: false},
      //     restore: {},
      //     saveAsImage: {}
      //   }
      // },
      visualMap: {
        type: 'piecewise',
        pieces: visualPieces,
      },
      series: [
        {
          name: '',
          type: 'map',
          mapType: mapName,
          label: {
            show: mapName === 'china-cities' ? false : true,
          },
          tooltip: {
            formatter: ({ name, data }) => {
              if (data) {
                const { name, value, confirmed, dead, cured, increased } = data;
                const tip = `<b>${name}</b><br />确诊人数：${confirmed}<br />治愈人数：${cured}<br />死亡人数：${dead}<br />新增确诊：${increased}`;
                return tip;
              }
              return `<b>${name}</b><br />暂无数据`;
            },
          },
          data: data.map(r => {
            return {
              name: r.showName,
              province: r.name,
              value: r[valueKey],
              confirmed: r.confirmedCount,
              dead: r.deadCount,
              cured: r.curedCount,
              increased: r.confirmedIncreased,
            };
          }),
        }
      ]
    },
    options: data.map(d => {
      return {
        series: {
          title: {
            text: d.day,
          },
          data: d.records.map(r => {
            return {
              name: r.showName,
              province: r.name,
              value: r[valueKey],
              confirmed: r.confirmedCount,
              dead: r.deadCount,
              cured: r.curedCount,
              increased: r.confirmedIncreased,
            };
          }),
        },
      };
    })
  };


  return config;
}

function setupTrendsCharts(records, container) {
  const html = records.map((v, i) => {
    return `<div id="chart${i}" class="mychart" style="display:inline-block;width:560px;height:400px;"></div>`;
  }).join('');
  container.innerHTML = html;

  return records.map((v, i) => {
    const cfg = createTrendsChartConfig(v);
    const chart = echarts.init(document.getElementById(`chart${i}`));
    chart.setOption(cfg);
    return chart;
  });
}

async function setupMapCharts(records, container, province = '', allCities = false) {
  const mapName = !province ? (allCities ? 'china-cities' : 'china') : {
    '安徽': 'anhui', '澳门': 'aomen', '北京': 'beijing', '重庆': 'chongqing', '福建': 'fujian', '甘肃': 'gansu', '广东': 'guangdong', '广西': 'guangxi', '贵州': 'guizhou', '海南': 'hainan', '河北': 'hebei', '黑龙江': 'heilongjiang', '河南': 'henan', '湖北': 'hubei', '湖南': 'hunan', '江苏': 'jiangsu', '江西': 'jiangxi', '吉林': 'jilin', '辽宁': 'liaoning', '内蒙古': 'neimenggu', '宁夏': 'ningxia', '青海': 'qinghai', '山东': 'shandong', '上海': 'shanghai', '山西': 'shanxi', '陕西': 'shanxi1', '四川': 'sichuan', '台湾': 'taiwan', '天津': 'tianjin', '香港': 'xianggang', '新疆': 'xinjiang', '西藏': 'xizang', '云南': 'yunnan', '浙江': 'zhejiang',
  }[shortAreaName(province)];
  const html = `<div id="mapchart" class="mychart" style="display:inline-block;width:100%;height:100%;"></div>`;
  container.innerHTML = html;
  const cfg = await createMapChartConfig({ mapName, data: records });
  const chart = echarts.init(document.getElementById(`mapchart`));
  chart.setOption(cfg);

  if (mapName === 'china') {
    chart.on('click', (params) => {
      showMap(params.data.province);
    });
  }

  return [ chart ];
}


async function prepareChartData(name, type = 'area') {
  const dataList = await getData(type);

  allCharts.forEach(c => {
    c.clear();
    delete c;
  });

  let records = null;
  if (type === 'area') {
    records = name ? dataList.filter(v => v.name === name)[0].cityList : dataList;
  } else {
    records = name ? dataList.map(d => {
      return {
        day: d.day,
        records: d.records.filter(p => p.name == name)[0].cityList,
      };
    }) : dataList;
  }
  records.forEach(v => {
    v.showName = v.name;
  });

  return records;
}

async function showProvince(name) {
  const records = await prepareChartData(name, 'area');
  allCharts = setupTrendsCharts(records, document.getElementById(chartsContainerId));
}

async function showMap(name) {
  const records = await prepareChartData(name, 'date');
  allCharts = await setupMapCharts(records, document.getElementById(chartsContainerId), name);
}


async function showAllCitiesMap() {
  const zhixiashi = [ '北京市', '重庆市', '上海市', '天津市' ];
  const data = await prepareChartData(name, 'date');
  const records = data.map(d => {
    return {
      day: d.day,
      records: d.records.reduce((p, v) => {
        return p.concat(zhixiashi.indexOf(v.name) > -1 ? v : v.cityList)
      }, []),
    }
  })
  allCharts = await setupMapCharts(records, document.getElementById(chartsContainerId), '', true);
}

async function playAllCitiesMap() {
  showDateIndex = 0;
  const func = async () => {
    showDateIndex = (showDateIndex + 1) % allDates.length;
    if (showDateIndex == allDates.length - 1) {
      clearInterval(showDateInterval);
      showAllCitiesMap();
      return;
    }
    const dayStr = allDates[showDateIndex];
    const records = allProvinces.reduce((p, v) => {
      const cityList = v.cityList.map(c => {
        return Object.assign({ name: c.name }, c.records.filter(r => {
          return r.updateTime === dayStr;
        })[0] || { confirmedCount: 0, deadCount: 0, curedCount: 0 });
      });
      return p.concat(cityList);
    }, []);
    const cfg = await createMapChartConfig({ mapName: 'china-cities', data: records, title: dayStr });
    allCharts[0].setOption(cfg);
  };
  func();
  showDateInterval = setInterval(func, 1000);
}

async function main() {
  showMap();
}

main();
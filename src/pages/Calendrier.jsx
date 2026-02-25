import Layout from '../components/Layout'

const sampleOutfits = ['(aucune)', 'Look casual', 'Tenue soirée', 'Bureau chic']

const getMonthGridStart = (year, month) => {
  const first = new Date(year, month, 1)
  const dow = (first.getDay() + 6) % 7
  return new Date(year, month, 1 - dow)
}

const buildMonthCells = (year, month) => {
  const start = getMonthGridStart(year, month)
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    return {
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      key: date.toISOString(),
    }
  })
}

function Calendrier() {
  const year = new Date().getFullYear()
  const months = Array.from({ length: 12 }, (_, m) => ({
    name: new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(year, m, 1)),
    cells: buildMonthCells(year, m),
  }))

  return (
    <Layout title="Calendrier">
      <div className="panel">
        <div className="row">
          <h2>Planifier tes tenues</h2>
          <div className="row" style={{ gap: '6px' }}>
            <button className="btn" type="button">◀</button>
            <div className="chip">{year}</div>
            <button className="btn" type="button">▶</button>
          </div>
        </div>
        <div className="months">
          {months.map((month) => (
            <div className="month" key={month.name}>
              <h3>{month.name}</h3>
              <div className="month-grid">
                {month.cells.map((cell) => (
                  <div className={`cell${cell.inMonth ? '' : ' dim'}`} key={cell.key}>
                    <div className="d">{cell.day}</div>
                    <div className="mini-stage">
                      <img className="layer" src="/images/base.png" alt="base" />
                    </div>
                    <select className="mini-select" defaultValue={sampleOutfits[0]}>
                      {sampleOutfits.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}

export default Calendrier

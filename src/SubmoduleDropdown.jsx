import React from 'react'
import { Dropdown } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

export default function SubmoduleDropdown({
  title,
  items,
  styles = {
    container: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' },
    text: { fontSize: '1.5rem', marginBottom: '10px' },
    menu: { width: '200px', backgroundColor: '#00a896', color: "#f0f3bd" },
    item: { cursor: 'pointer', color: "#f0f3bd", backgroundColor: "#00a896", hover: { backgroundColor: '#028090' } }
  }

}) {
  const navigate = useNavigate()

  return (
    <div style={styles.container}>
      {title && <h2 style={styles.text}>{title}</h2>}
      <Dropdown>
        <Dropdown.Toggle style={styles.menu}>
          Select
        </Dropdown.Toggle>
        <Dropdown.Menu style={styles.menu}>
          {items.map(item => (
            <Dropdown.Item
              key={item.label}
              style={styles.item}
              onClick={() => navigate(item.path)}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = styles.item.hover.backgroundColor}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = styles.item.backgroundColor}
            >
              {item.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  )
}
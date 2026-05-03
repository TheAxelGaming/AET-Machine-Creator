import React, { useState, useEffect, useMemo } from 'react'
import { Search, Save, Download, Trash2, Plus, Zap, Tag, Coins, Image as ImageIcon, ArrowLeft, LayoutGrid, PlusCircle, Settings, Upload, FileJson, RefreshCw } from 'lucide-react'
import JSZip from 'jszip'

function App() {
  // Intentar recuperar el estado de la sesión previa
  const savedView = localStorage.getItem('aet_view') || 'list'
  const savedMeta = JSON.parse(localStorage.getItem('aet_current_meta') || 'null')
  const savedSelected = JSON.parse(localStorage.getItem('aet_current_selected') || '[]')

  const [view, setView] = useState(savedView)
  const [items, setItems] = useState([])
  const [existingMachines, setExistingMachines] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  
  // Machine State (Editor)
  const [machineMeta, setMachineMeta] = useState(savedMeta || {
    name: 'Nueva Maquina',
    id: 'MyCustomTrader',
    texture: 'WorldItems/MyCustomTexture',
    scale: 0.6,
    weight: 15.0,
    textureFile: null,
    iconFile: null
  })

  const [selectedItems, setSelectedItems] = useState(savedSelected)
  const [globalDiscount, setGlobalDiscount] = useState(0)
  const [visibleCount, setVisibleCount] = useState(100)
  const [selectedForExport, setSelectedForExport] = useState([])

  useEffect(() => {
    // Resetear contador cuando cambie la búsqueda o categoría
    setVisibleCount(100)
  }, [searchTerm, selectedCategory])

  useEffect(() => {
    // Intentar cargar desde localStorage primero, si no, desde los archivos
    const savedMachines = localStorage.getItem('aet_machines')
    
    Promise.all([
      fetch('./items.json').then(res => res.json()),
      savedMachines ? Promise.resolve(JSON.parse(savedMachines)) : fetch('./machines.json').then(res => res.json()).catch(() => [])
    ]).then(([itemsData, machinesData]) => {
      setItems(itemsData)
      setExistingMachines(machinesData)
      setLoading(false)
    }).catch(err => {
      console.error("Error loading data", err)
      setLoading(false)
    })
  }, [])

  // Guardar estado de sesión en tiempo real
  useEffect(() => {
    localStorage.setItem('aet_view', view)
    localStorage.setItem('aet_current_meta', JSON.stringify(machineMeta))
    localStorage.setItem('aet_current_selected', JSON.stringify(selectedItems))
  }, [view, machineMeta, selectedItems])

  // Guardar en localStorage todas las máquinas
  useEffect(() => {
    if (existingMachines.length > 0) {
      localStorage.setItem('aet_machines', JSON.stringify(existingMachines))
    }
  }, [existingMachines])

  const saveChanges = () => {
    const updatedMachines = existingMachines.map(m => {
      if (m.id === machineMeta.id) {
        return {
          ...machineMeta,
          items: selectedItems.map(i => ({ id: i.id, price: i.price, currency: i.currency }))
        }
      }
      return m
    })

    // Si es una máquina nueva, añadirla
    if (!existingMachines.find(m => m.id === machineMeta.id)) {
      updatedMachines.push({
        ...machineMeta,
        items: selectedItems.map(i => ({ id: i.id, price: i.price, currency: i.currency }))
      })
    }

    setExistingMachines(updatedMachines)
    alert("Cambios guardados en la lista local. ¡Ya puedes volver al inicio!")
  }

  const categories = useMemo(() => {
    const cats = [...new Set(items.map(i => i.category))].filter(Boolean).sort()
    return ['All', ...cats]
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.id.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory
      return matchesSearch && matchesCat
    })
  }, [items, searchTerm, selectedCategory])

  const handleSelectItem = (item) => {
    if (selectedItems.find(i => i.id === item.id)) return
    setSelectedItems([...selectedItems, { ...item, discount: 0 }])
  }

  const handleRemoveItem = (id) => {
    setSelectedItems(selectedItems.filter(i => i.id !== id))
  }

  const updateItem = (id, field, value) => {
    setSelectedItems(selectedItems.map(i => 
      i.id === id ? { ...i, [field]: value } : i
    ))
  }

  const startEditing = (machine) => {
    setMachineMeta({
      name: machine.name,
      id: machine.id,
      texture: machine.texture,
      scale: machine.scale,
      weight: machine.weight,
      textureFile: null, // Nuevos campos para Phase 3
      iconFile: null
    })
    // Mapear los items de la máquina con sus datos completos del catálogo (como iconos)
    const itemsWithIcons = machine.items.map(mItem => {
      const catalogItem = items.find(cat => cat.id.toLowerCase() === mItem.id.toLowerCase())
      const idParts = mItem.id.split('.')
      return {
        ...mItem,
        id: catalogItem ? catalogItem.id : mItem.id, // Usar el ID original del catálogo si se encuentra (capitalización correcta)
        name: catalogItem?.name || idParts[idParts.length - 1],
        icon_path: catalogItem?.icon_path,
        discount: 0
      }
    })
    setSelectedItems(itemsWithIcons)
    setView('editor')
  }

  const syncWithFiles = async () => {
    try {
      setLoading(true)
      // Usar timestamp para evitar cache del navegador
      const res = await fetch(`/machines.json?t=${Date.now()}`)
      const data = await res.json()
      setExistingMachines(data)
      localStorage.setItem('aet_machines', JSON.stringify(data))
      
      // Si estamos editando una máquina, refrescar sus items
      if (view === 'editor') {
        const currentInFiles = data.find(m => m.id === machineMeta.id)
        if (currentInFiles) {
          const itemsWithIcons = currentInFiles.items.map(mItem => {
            const catalogItem = items.find(cat => cat.id.toLowerCase() === mItem.id.toLowerCase())
            const idParts = mItem.id.split('.')
            return {
              ...mItem,
              id: catalogItem ? catalogItem.id : mItem.id, // Corrección del case del ID
              name: catalogItem?.name || idParts[idParts.length - 1],
              icon_path: catalogItem?.icon_path,
              discount: 0
            }
          })
          setSelectedItems(itemsWithIcons)
        }
      }
      
      alert("¡Datos sincronizados con éxito desde los archivos del mod!")
    } catch (err) {
      alert("Error al sincronizar: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const exportProject = () => {
    const data = {
      machines: existingMachines,
      timestamp: new Date().toISOString(),
      version: "1.0"
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Proyecto_Dispencers_${new Date().toLocaleDateString()}.aet`
    link.click()
  }

  const importProject = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (data.machines) {
          setExistingMachines(data.machines)
          alert("¡Proyecto cargado con éxito!")
        }
      } catch (err) {
        alert("Error al cargar el archivo de respaldo.")
      }
    }
    reader.readAsText(file)
  }
  const createNew = () => {
    setMachineMeta({
      name: 'Nueva Maquina',
      id: 'MyCustomTrader',
      texture: 'WorldItems/MyCustomTexture',
      scale: 0.6,
      weight: 15.0,
      textureFile: null,
      iconFile: null
    })
    setSelectedItems([])
    setView('editor')
  }

  const generateTxtCode = () => {
    return `module AutomaticEconomyTrader {
    imports {
        Base
    }
    item ${machineMeta.id}
    {
        Weight = ${machineMeta.weight},
        ItemType = Normal,
        DisplayName = ${machineMeta.name},
        Icon = ${machineMeta.id},
        StaticModel = ${machineMeta.id}_Model,
        WorldStaticModel = ${machineMeta.id}_Model,
        DisplayCategory = Furniture,
        IsMoveable = true,
        CanBePlaced = true,
    }
}

module Base {
    model ${machineMeta.id}_Model
    {
        mesh = dispencer,
        texture = ${machineMeta.texture},
        scale = ${machineMeta.scale},
    }
}`
  }

  const generateLuaCode = () => {
    const itemsCode = selectedItems.map(item => {
      const priceAfterDiscount = Math.ceil(item.price * (1 - (item.discount || 0) / 100) * (1 - globalDiscount / 100))
      return `        { id = "${item.id}", price = ${priceAfterDiscount}, currency = "${item.currency}" }`
    }).join(',\n')

    return `AETDefaultItems = AETDefaultItems or {}
AETDefaultItems.${machineMeta.id} = {
${itemsCode}
}`
  }

  const handleDownload = async () => {
    const zip = new JSZip()
    const media = zip.folder("media")
    const scripts = media.folder("scripts")
    const lua = media.folder("lua").folder("shared")
    
    scripts.file(`${machineMeta.id}.txt`, generateTxtCode())
    lua.file(`AET_${machineMeta.id}_items.lua`, generateLuaCode())

    // Incluir Textura de Modelo si existe
    if (machineMeta.textureFile) {
      const texturesFolder = media.folder("textures")
      const worldItemsFolder = texturesFolder.folder("WorldItems")
      worldItemsFolder.file(machineMeta.textureFile.name, machineMeta.textureFile)
    }

    // Incluir Icono de Inventario si existe
    if (machineMeta.iconFile) {
      const texturesFolder = media.folder("textures")
      // Zomboid espera Item_Prefix para iconos de inventario
      texturesFolder.file(`Item_${machineMeta.id}.png`, machineMeta.iconFile)
    }
    
    const content = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(content)
    link.download = `${machineMeta.id}_ModFiles.zip`
    link.click()
  }

  const handleBulkExport = async () => {
    const zip = new JSZip()
    const media = zip.folder("media")
    const scripts = media.folder("scripts")
    const lua = media.folder("lua").folder("shared")
    const textures = media.folder("textures")
    const worldItems = textures.folder("WorldItems")

    for (const machineId of selectedForExport) {
      const machine = existingMachines.find(m => m.id === machineId)
      if (!machine) continue

      // Temporarily set machineMeta to generate code for this specific machine
      // This is a bit hacky but efficient for now
      const tempMeta = { ...machineMeta, ...machine }
      
      // Local helper to generate code without changing state
      const getTxt = () => {
        return `module AutomaticEconomyTrader {\n    imports { Base }\n    item ${machine.id}\n    {\n        Weight = ${machine.weight || 15.0},\n        ItemType = Normal,\n        DisplayName = ${machine.name},\n        Icon = ${machine.id},\n        StaticModel = ${machine.id}_Model,\n        WorldStaticModel = ${machine.id}_Model,\n        DisplayCategory = Furniture,\n        IsMoveable = true,\n        CanBePlaced = true,\n    }\n}\n\nmodule Base {\n    model ${machine.id}_Model\n    {\n        mesh = dispencer,\n        texture = ${machine.texture},\n        scale = ${machine.scale || 0.6},\n    }\n}`
      }

      const getLua = () => {
        const itemsCode = (machine.items || []).map(item => `        { id = "${item.id}", price = ${item.price}, currency = "${item.currency}" }`).join(',\n')
        return `AETDefaultItems = AETDefaultItems or {}\nAETDefaultItems.${machine.id} = {\n${itemsCode}\n}`
      }

      scripts.file(`${machine.id}.txt`, getTxt())
      lua.file(`AET_${machine.id}_items.lua`, getLua())
    }

    const content = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(content)
    link.download = `Bulk_Machines_Export.zip`
    link.click()
  }

  const toggleMachineSelection = (id) => {
    setSelectedForExport(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    )
  }

  if (view === 'list') {
    return (
      <div className="app-container">
        <header>
          <div className="logo">AET MACHINE CREATOR</div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary" style={{ border: 'none', background: 'transparent' }} onClick={syncWithFiles} title="Sincronizar con archivos del mod">
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Sincronizar
              </button>
              <button className="btn btn-secondary" style={{ border: 'none', background: 'transparent' }} onClick={exportProject} title="Guardar Proyecto Completo">
                <FileJson size={18} /> Backup
              </button>
              <label className="btn btn-secondary" style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }} title="Cargar Proyecto Guardado">
                <Upload size={18} /> Cargar
                <input type="file" accept=".aet,.json" onChange={importProject} style={{ display: 'none' }} />
              </label>
            </div>
            {selectedForExport.length > 0 && (
              <button className="btn btn-primary" style={{ background: 'var(--accent-pink)', color: 'white' }} onClick={handleBulkExport}>
                <Download size={18} /> Exportar Selección ({selectedForExport.length})
              </button>
            )}
            <button className="btn btn-primary" onClick={createNew}>
              <PlusCircle size={18} /> Nueva Máquina
            </button>
          </div>
        </header>
        <main>
          <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <LayoutGrid size={28} color="var(--accent-blue)" /> Mis Máquinas
          </h2>
          <div className="grid">
            {existingMachines.map((m) => (
              <div 
                key={m.id} 
                className={`card machine-card ${selectedForExport.includes(m.id) ? 'selected' : ''}`} 
                onClick={() => startEditing(m)}
                style={{ position: 'relative' }}
              >
                {/* Checkbox de Selección */}
                <div 
                  onClick={(e) => { e.stopPropagation(); toggleMachineSelection(m.id); }}
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    border: '2px solid var(--accent-blue)',
                    background: selectedForExport.includes(m.id) ? 'var(--accent-blue)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifycontent: 'center',
                    cursor: 'pointer',
                    zIndex: 10
                  }}
                >
                  {selectedForExport.includes(m.id) && <Zap size={14} color="black" />}
                </div>

                <div className="machine-title">{m.name}</div>
                <div className="machine-id">ID: {m.id}</div>
                
                <div className="machine-stats">
                  <div className="machine-icon-wrapper">
                    <ImageIcon size={24} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {m.items ? m.items.length : 0} ítems configurados
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Textura: {m.texture}
                    </div>
                  </div>
                </div>
                
                <button className="btn btn-action" onClick={(e) => { e.stopPropagation(); startEditing(m); }}>
                  <Settings size={18} /> Editar Configuración
                </button>
              </div>
            ))}
            
            {/* Tarjeta para Añadir Nueva */}
            <div className="add-new-card" onClick={createNew}>
              <Plus size={48} className="plus-icon" />
              <div style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Crear Nueva Máquina</div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-container">
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setView('list')}>
            <ArrowLeft size={20} />
          </button>
          <div className="logo">EDITOR: {machineMeta.name}</div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary" style={{ background: 'var(--accent-blue)', color: 'black' }} onClick={saveChanges}>
            <Save size={18} /> Guardar Cambios
          </button>
          <button className="btn btn-primary" onClick={handleDownload}>
            <Download size={18} /> Exportar ZIP
          </button>
        </div>
      </header>

      <main>
        <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* LEFT COLUMN: Item Selector */}
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2><Coins size={24} color="var(--accent-gold)" /> Selección de Ítems ({selectedItems.length})</h2>
              
              <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                  <input 
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="Buscar ítems por nombre o ID..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                  value={selectedCategory} 
                  onChange={e => setSelectedCategory(e.target.value)}
                  style={{ width: '180px' }}
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
              {/* Selection Table */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <label>Ítems Seleccionados</label>
                <div className="item-grid" style={{ display: 'block', height: 'calc(50vh - 100px)', minHeight: '250px', overflowY: 'auto', flex: 1 }}>
                  {selectedItems.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No hay ítems seleccionados. Haz clic en el catálogo para añadir.
                    </div>
                  )}
                  {selectedItems.map(item => (
                    <div key={item.id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem', 
                      padding: '0.75rem', 
                      borderBottom: '1px solid var(--border-color)',
                      background: '#0d1117'
                    }}>
                      <img 
                        src={item.icon_path ? `${window.location.origin}${window.location.pathname}${item.icon_path}` : 'https://via.placeholder.com/40?text=?'} 
                        alt="" 
                        style={{ width: '32px', height: '32px', objectFit: 'contain' }} 
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/40?text=?'; }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', opacity: 0.8, fontFamily: 'monospace' }}>
                          {item.id}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <input 
                          type="number" 
                          value={item.price} 
                          onChange={e => updateItem(item.id, 'price', parseInt(e.target.value) || 0)}
                          style={{ width: '60px', padding: '0.25rem' }}
                        />
                        <select 
                          value={item.currency}
                          onChange={e => updateItem(item.id, 'currency', e.target.value)}
                          style={{ width: '70px', padding: '0.25rem' }}
                        >
                          <option value="silver">Plata</option>
                          <option value="gold">Oro</option>
                          <option value="mdg">MDG</option>
                        </select>
                        <div style={{ position: 'relative' }}>
                          <Tag size={12} style={{ position: 'absolute', left: '6px', top: '10px', color: 'var(--accent-pink)' }} />
                          <input 
                            type="number" 
                            placeholder="%"
                            value={item.discount} 
                            onChange={e => updateItem(item.id, 'discount', parseInt(e.target.value) || 0)}
                            style={{ width: '50px', padding: '0.25rem', paddingLeft: '1.2rem', borderColor: 'var(--accent-pink)' }}
                          />
                        </div>
                        <button className="btn" style={{ padding: '0.25rem', color: 'var(--accent-pink)' }} onClick={() => handleRemoveItem(item.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Catalog */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <label>Catálogo de Juego</label>
                {loading ? (
                  <div className="item-grid" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    Cargando ítems...
                  </div>
                ) : (
                  <div className="item-grid" style={{ flex: 1, overflowY: 'auto', height: 'calc(50vh - 100px)', minHeight: '250px' }}>
                    {filteredItems.slice(0, visibleCount).map(item => (
                      <div 
                        key={item.id} 
                        className={`item-card ${selectedItems.find(i => i.id === item.id) ? 'selected' : ''}`}
                        onClick={() => handleSelectItem(item)}
                      >
                        <img 
                          src={item.icon_path ? `${window.location.origin}${window.location.pathname}${item.icon_path}` : 'https://via.placeholder.com/40?text=?'} 
                          alt="" 
                          className="item-icon" 
                          onError={(e) => { e.target.src = 'https://via.placeholder.com/40?text=?'; }}
                        />
                        <div className="item-name" title={item.name}>{item.name}</div>
                        <div className="item-price-tag">{item.price} {item.currency}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Mostrando {Math.min(visibleCount, filteredItems.length)} de {filteredItems.length} ítems.
                  </p>
                  {visibleCount < filteredItems.length && (
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setVisibleCount(prev => prev + 200)}
                      style={{ padding: '0.4rem 1rem' }}
                    >
                      Cargar más ítems...
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Config & Code Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Configuración de Máquina */}
            <div className="card">
              <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={24} color="var(--accent-blue)" /> Configuración de Máquina
              </h2>
              
              <div className="form-group">
                <label>Nombre de la Máquina (In-game)</label>
                <input 
                  value={machineMeta.name} 
                  onChange={e => setMachineMeta({...machineMeta, name: e.target.value})}
                  placeholder="Ej: Dispensador de Armas"
                />
              </div>

              <div className="form-group">
                <label>ID Único (Sin espacios)</label>
                <input 
                  value={machineMeta.id} 
                  onChange={e => setMachineMeta({...machineMeta, id: e.target.value})}
                  placeholder="Ej: WeaponTrader"
                />
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group">
                  <label>Escala</label>
                  <input 
                    type="number" step="0.1"
                    value={machineMeta.scale} 
                    onChange={e => setMachineMeta({...machineMeta, scale: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="form-group">
                  <label>Peso</label>
                  <input 
                    type="number" step="1"
                    value={machineMeta.weight} 
                    onChange={e => setMachineMeta({...machineMeta, weight: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Ruta de Textura (PZ Format)</label>
                <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                  <input 
                    value={machineMeta.texture} 
                    onChange={e => setMachineMeta({...machineMeta, texture: e.target.value})}
                    placeholder="WorldItems/TextureName"
                  />
                  <ImageIcon size={18} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                </div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div className="form-group">
                  <label>Subir Textura Modelo (.png)</label>
                  <input 
                    type="file" 
                    accept="image/png"
                    onChange={e => {
                      const file = e.target.files[0]
                      if (file) {
                        setMachineMeta({
                          ...machineMeta, 
                          textureFile: file,
                          texture: `WorldItems/${file.name.replace('.png', '')}`
                        })
                      }
                    }}
                    style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                  />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                    💡 Rec: 256x256 o 512x512 px
                  </div>
                </div>

                <div className="form-group">
                  <label>Subir Icono Inventario (.png)</label>
                  <input 
                    type="file" 
                    accept="image/png"
                    onChange={e => {
                      const file = e.target.files[0]
                      if (file) {
                        setMachineMeta({
                          ...machineMeta, 
                          iconFile: file
                        })
                      }
                    }}
                    style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                  />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                    💡 Rec: 32x32 px o 128x128 px
                  </div>
                </div>
              </div>

              <hr style={{ margin: '2rem 0', borderColor: 'var(--border-color)' }} />

              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Tag size={20} color="var(--accent-pink)" /> Descuento Global (%)
              </h3>
              <input 
                type="number" min="0" max="100"
                value={globalDiscount} 
                onChange={e => setGlobalDiscount(parseInt(e.target.value) || 0)}
                style={{ borderLeft: '4px solid var(--accent-pink)' }}
              />
            </div>

            {/* Vista Previa del Código */}
            <div className="card">
               <h2 style={{ marginBottom: '1.5rem' }}>Vista Previa del Código</h2>
               <label>Script (.txt)</label>
               <pre className="preview-pane" style={{ marginBottom: '1rem', maxHeight: '250px' }}>
                  {generateTxtCode()}
               </pre>
               <label>Data (.lua)</label>
               <pre className="preview-pane" style={{ maxHeight: '250px' }}>
                  {generateLuaCode()}
               </pre>
            </div>
          </div>
        </div>
      </main>

      <footer style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        AET Machine Creator for Project Zomboid B42 — Creado por Antigravity
      </footer>
    </div>
  )
}

export default App

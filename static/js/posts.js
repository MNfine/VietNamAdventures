function focusRegion(regionId) {
    const allHotspots = document.querySelectorAll('.hotspot');
    allHotspots.forEach(h => {
      h.style.transform = 'translate(-50%, -50%) scale(1)';
    });
  
    const region = document.getElementById(regionId);
    region.style.transform = 'translate(-50%, -50%) scale(2)';
  }
  
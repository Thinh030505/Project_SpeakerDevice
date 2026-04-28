const CACHE_KEY = 'soundhouse_vietnam_locations';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

const FALLBACK_LOCATIONS = [
    {
        name: 'Thành phố Hồ Chí Minh',
        districts: [
            {
                name: 'Quận 1',
                wards: ['Phường Bến Nghé', 'Phường Bến Thành', 'Phường Cầu Kho', 'Phường Cầu Ông Lãnh', 'Phường Đa Kao']
            },
            {
                name: 'Quận 3',
                wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường Võ Thị Sáu']
            },
            {
                name: 'Thành phố Thủ Đức',
                wards: ['Phường An Khánh', 'Phường Bình Thọ', 'Phường Hiệp Bình Chánh', 'Phường Linh Trung', 'Phường Thảo Điền']
            }
        ]
    },
    {
        name: 'Thành phố Hà Nội',
        districts: [
            {
                name: 'Quận Hoàn Kiếm',
                wards: ['Phường Chương Dương', 'Phường Cửa Đông', 'Phường Hàng Bạc', 'Phường Hàng Bông', 'Phường Tràng Tiền']
            },
            {
                name: 'Quận Ba Đình',
                wards: ['Phường Cống Vị', 'Phường Điện Biên', 'Phường Đội Cấn', 'Phường Kim Mã', 'Phường Ngọc Hà']
            }
        ]
    },
    {
        name: 'Thành phố Đà Nẵng',
        districts: [
            {
                name: 'Quận Hải Châu',
                wards: ['Phường Bình Hiên', 'Phường Hải Châu I', 'Phường Hải Châu II', 'Phường Hòa Cường Bắc']
            },
            {
                name: 'Quận Sơn Trà',
                wards: ['Phường An Hải Bắc', 'Phường An Hải Đông', 'Phường Mân Thái', 'Phường Nại Hiên Đông']
            }
        ]
    }
];

const normalizeLocations = (items = []) => items.map((province) => ({
    name: province.name,
    districts: (province.districts || []).map((district) => ({
        name: district.name,
        wards: (district.wards || []).map((ward) => ward.name || ward).filter(Boolean)
    })).filter((district) => district.name)
})).filter((province) => province.name);

const readCache = () => {
    try {
        const cached = JSON.parse(window.sessionStorage.getItem(CACHE_KEY) || 'null');
        if (cached?.savedAt && Date.now() - cached.savedAt < CACHE_TTL && Array.isArray(cached.items)) {
            return cached.items;
        }
    } catch {
        return null;
    }
    return null;
};

const writeCache = (items) => {
    try {
        window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({
            savedAt: Date.now(),
            items
        }));
    } catch {
        // Cache is optional; dropdowns still work without storage.
    }
};

export const loadVietnamLocations = async () => {
    const cached = readCache();
    if (cached?.length) {
        return cached;
    }

    try {
        const response = await fetch('https://provinces.open-api.vn/api/?depth=3');
        if (!response.ok) {
            throw new Error('Cannot load locations');
        }

        const locations = normalizeLocations(await response.json());
        if (locations.length) {
            writeCache(locations);
            return locations;
        }
    } catch {
        // Fall back to a small local dataset so the address form remains usable.
    }

    return FALLBACK_LOCATIONS;
};

const fillSelect = (select, items, placeholder) => {
    if (!select) {
        return;
    }

    select.replaceChildren();
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    select.appendChild(placeholderOption);

    items.forEach((item) => {
        const option = document.createElement('option');
        option.value = typeof item === 'string' ? item : item.name;
        option.textContent = typeof item === 'string' ? item : item.name;
        select.appendChild(option);
    });
};

const findByName = (items, name) => items.find((item) => item.name === name);

export const initLocationDropdowns = async (root = document) => {
    const groups = Array.from(root.querySelectorAll('[data-location-group]'));
    if (!groups.length) {
        return [];
    }

    const locations = await loadVietnamLocations();

    groups.forEach((group) => {
        const citySelect = group.querySelector('[data-location-city]');
        const districtSelect = group.querySelector('[data-location-district]');
        const wardSelect = group.querySelector('[data-location-ward]');
        const cityValue = citySelect?.dataset.selected || citySelect?.value || '';
        const districtValue = districtSelect?.dataset.selected || districtSelect?.value || '';
        const wardValue = wardSelect?.dataset.selected || wardSelect?.value || '';

        const renderDistricts = () => {
            const province = findByName(locations, citySelect.value);
            fillSelect(districtSelect, province?.districts || [], 'Chọn Quận / Huyện');
            districtSelect.disabled = !province;
            fillSelect(wardSelect, [], 'Chọn Phường / Xã');
            wardSelect.disabled = true;
        };

        const renderWards = () => {
            const province = findByName(locations, citySelect.value);
            const district = findByName(province?.districts || [], districtSelect.value);
            fillSelect(wardSelect, district?.wards || [], 'Chọn Phường / Xã');
            wardSelect.disabled = !district;
        };

        fillSelect(citySelect, locations, 'Chọn Tỉnh / Thành phố');
        fillSelect(districtSelect, [], 'Chọn Quận / Huyện');
        fillSelect(wardSelect, [], 'Chọn Phường / Xã');
        districtSelect.disabled = true;
        wardSelect.disabled = true;

        if (cityValue) {
            citySelect.value = cityValue;
            renderDistricts();
        }
        if (districtValue) {
            districtSelect.value = districtValue;
            renderWards();
        }
        if (wardValue) {
            wardSelect.value = wardValue;
        }

        citySelect.addEventListener('change', () => {
            renderDistricts();
        });
        districtSelect.addEventListener('change', () => {
            renderWards();
        });
    });

    return locations;
};

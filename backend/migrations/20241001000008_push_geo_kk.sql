-- Account deletion: deleted users are anonymised, history stays for the other side
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Expo push tokens, one row per device
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform VARCHAR(20),
    language VARCHAR(5) NOT NULL DEFAULT 'ru', -- 'ru' | 'kk'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);

-- Kazakh names for service categories
ALTER TABLE service_categories
    ADD COLUMN IF NOT EXISTS name_kk VARCHAR(100),
    ADD COLUMN IF NOT EXISTS description_kk TEXT;

UPDATE service_categories AS sc SET name_kk = v.name_kk, description_kk = v.description_kk
FROM (VALUES
    ('car-heating',        'Көлікті жылыту',            'Қозғалтқыш пен салонды жылыту, құлыптарды еріту'),
    ('jump-start',         'Көлікті от алдыру',         'Бустерден немесе басқа көліктен от алдыру'),
    ('diagnostics',        'Компьютерлік диагностика',  'OBD2 арқылы көшпелі диагностика'),
    ('unlock',             'Көлікті ашу',               'Кілт ішінде қалса, құлыптарды зақымдамай ашу'),
    ('fuel-delivery',      'Жанармай жеткізу',          'Бензин немесе дизель жеткізу'),
    ('tow-truck',          'Эвакуатор',                 'Көлікті эвакуатормен тасымалдау'),
    ('mobile-tire-service','Көшпелі шиномонтаж',        'Дөңгелекті ауыстыру немесе тесікті орнында жөндеу'),
    ('engine-oil',         'Қозғалтқыш майын ауыстыру', 'Мотор майы мен сүзгісін ауыстыру'),
    ('gearbox-oil',        'АБҚ майын ауыстыру',        'Автоматты беріліс қорабындағы майды ауыстыру'),
    ('filters',            'Сүзгілерді ауыстыру',       'Ауа, салон, отын сүзгілері'),
    ('brake-pads',         'Тежегіш қалыптарын ауыстыру','Алдыңғы және артқы тежегіш қалыптары'),
    ('brake-discs',        'Тежегіш дискілерін ауыстыру','Тежегіш дискілері қалыптарымен бірге'),
    ('spark-plugs',        'Оталдыру шамдарын ауыстыру', 'Оталдыру және қыздыру шамдары'),
    ('tire-service',       'Шиномонтаж',                'Маусымдық ауыстыру, теңгеру'),
    ('electrics',          'Автоэлектрика',             'Электр жабдығын диагностикалау және жөндеу'),
    ('suspension',         'Жүріс бөлігі',              'Амортизаторлар, тіреулер, иінтіректер'),
    ('timing-belt',        'ГТМ белдігін ауыстыру',     'ГТМ белдігі немесе шынжыры, роликтер, помпа'),
    ('engine-overhaul',    'Қозғалтқышты күрделі жөндеу','Қозғалтқышты күрделі жөндеу')
) AS v(slug, name_kk, description_kk)
WHERE sc.slug = v.slug;

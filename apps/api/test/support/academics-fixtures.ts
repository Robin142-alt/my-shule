export const KENYAN_CBC_STRUCTURE = {
  system_type: 'CBC',
  levels: [
    {
      name: 'Pre-Primary',
      order_index: 1,
      classes: [
        { name: 'PP1', capacity: 30, streams: [{ name: 'North', capacity: 30 }] },
        { name: 'PP2', capacity: 30, streams: [{ name: 'South', capacity: 30 }] },
      ],
    },
    {
      name: 'Lower Primary',
      order_index: 2,
      classes: [
        { name: 'Grade 1', capacity: 40, streams: [{ name: 'East', capacity: 40 }] },
        { name: 'Grade 2', capacity: 40, streams: [{ name: 'East', capacity: 40 }] },
        { name: 'Grade 3', capacity: 40, streams: [{ name: 'East', capacity: 40 }] },
      ],
    },
    {
      name: 'Upper Primary',
      order_index: 3,
      classes: [
        { name: 'Grade 4', capacity: 40, streams: [{ name: 'West', capacity: 40 }] },
        { name: 'Grade 5', capacity: 40, streams: [{ name: 'West', capacity: 40 }] },
        { name: 'Grade 6', capacity: 40, streams: [{ name: 'West', capacity: 40 }] },
      ],
    },
    {
      name: 'Junior School',
      order_index: 4,
      classes: [
        { name: 'Grade 7', capacity: 45, streams: [{ name: 'A', capacity: 45 }, { name: 'B', capacity: 45 }] },
        { name: 'Grade 8', capacity: 45, streams: [{ name: 'A', capacity: 45 }, { name: 'B', capacity: 45 }] },
        { name: 'Grade 9', capacity: 45, streams: [{ name: 'A', capacity: 45 }, { name: 'B', capacity: 45 }] },
      ],
    },
    {
      name: 'Senior School',
      order_index: 5,
      classes: [
        { name: 'Grade 10', capacity: 45, streams: [{ name: 'STEM', capacity: 45 }, { name: 'Arts', capacity: 45 }] },
        { name: 'Grade 11', capacity: 45, streams: [{ name: 'STEM', capacity: 45 }, { name: 'Arts', capacity: 45 }] },
        { name: 'Grade 12', capacity: 45, streams: [{ name: 'STEM', capacity: 45 }, { name: 'Arts', capacity: 45 }] },
      ],
    },
  ],
};

export const KENYAN_844_STRUCTURE = {
  system_type: '8-4-4',
  levels: [
    {
      name: 'Primary',
      order_index: 1,
      classes: [
        { name: 'Class 8', capacity: 50, streams: [{ name: 'Blue', capacity: 50 }] },
      ],
    },
    {
      name: 'Secondary',
      order_index: 2,
      classes: [
        { name: 'Form 1', capacity: 45, streams: [{ name: 'North', capacity: 45 }] },
        { name: 'Form 2', capacity: 45, streams: [{ name: 'North', capacity: 45 }] },
        { name: 'Form 3', capacity: 45, streams: [{ name: 'North', capacity: 45 }] },
        { name: 'Form 4', capacity: 45, streams: [{ name: 'North', capacity: 45 }] },
      ],
    },
  ],
};

export const KENYAN_HYBRID_STRUCTURE = {
  system_type: 'Custom',
  levels: [
    ...KENYAN_CBC_STRUCTURE.levels,
    ...KENYAN_844_STRUCTURE.levels.map(l => ({ ...l, order_index: l.order_index + 10 })),
  ],
};

export const CBC_LEARNING_AREAS = [
  { code: 'MAT', name: 'Mathematics' },
  { code: 'ENG', name: 'English' },
  { code: 'KIS', name: 'Kiswahili' },
  { code: 'SCI', name: 'Integrated Science' },
  { code: 'SST', name: 'Social Studies' },
  { code: 'CRE', name: 'Christian Religious Education' },
  { code: 'PHE', name: 'Physical Health Education' },
  { code: 'HEC', name: 'Home Science' },
  { code: 'AGR', name: 'Agriculture' },
];

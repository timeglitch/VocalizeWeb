import { Textgrid, IntervalTier, PointTier, copyTextgrid, parseTextgrid } from 'praatio';
import React, { useState, useEffect } from 'react';

export default function WaveDisplay({ file }) {
    const [textgrid, setTextgrid] = useState(null);

    useEffect(() => {
        let tg = parseTextgrid(file);
        setTextgrid(tg);
        let tier = tg.tierDict['Vowel'];
        if (tier) {
            for (tierEntry of tierEntryList.length) {
                let entry = tier.entryList[tierEntry];
                console.log('Entry start:', entry[0], 'End:', entry[1], 'Label:', entry[2]);
            }
        }
    }, [file]);

}

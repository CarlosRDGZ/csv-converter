let csv = null;
let csvDisplay = false;
let resultDisplay = false;
const fileSelector = document.querySelector('#file-selector');
const fileError = document.querySelector('#file-error');
const btnDownload = document.querySelector('#btn-download');
const downloads = {
    fileName: '',
    json: '',
    xml: ''
};

class CSV {
    constructor(str, hasHeader) {
        this.data = str;
        this.hasHeader = hasHeader | true;
        this.currentIndex = 0;
        this.dataStartIndex = undefined;
    }

    fields() {
        const self = this;
        self.currentIndex = 0;
        return new Promise((resolve, reject) => {
            try {
                const props = self._readRow();
                self.dataStartIndex = self.currentIndex;
                resolve (props);
            } catch (err) {
                reject(err);
            }
        });
    }

    get matrix() {
        const data = [];
        this.currentIndex = this.dataStartIndex;
        while (this.data[this.currentIndex] !== undefined) {
            const row = this._readRow();
            data.push(row);
        }
        return data;
    }

    toJSON() {
        const self = this;
        return new Promise((resolve, reject) => {
            if (self.data.length > 0) {
                if (self.hasHeader) {
                    self.fields().then(function(props) {
                        const objects = [];
                        const length = props.length;
                        while (self.data[self.currentIndex] !== undefined) {
                            const data = self._readRow();
                            const obj = {};
                            for (let i = 0; i < length; i++)
                                obj[props[i]] = data[i];
                            objects.push(obj);
                        }
                        resolve(objects);
                    }).catch(function (err) {
                        reject(err);
                    });
                }
            } else {
                reject(Error('not header'));
            }
        });
    }

    toXML() {
        const self = this;
        return new Promise(function (resolve, reject) {
            if (self.data.length > 0) {
                self.fields().then(function(props) {
                    resolve('<table>' +
                        self.matrix.map(row => {
                            return '<row>' +
                                row.map((v, i) => {
                                    return '<' + props[i] + '>' + v + '</' + props[i] + '>';
                                }).join('') +
                            '</row>';
                        }).join('') +
                    '</table>');
                });
            } else {
                reject(Error('Invalid data'));
            }
        });
    }

    toHTMLTable () {
        const self = this;
        return new Promise(function(resolve, reject) {
            self.fields().then(fields => {
                resolve(`
                <table class="table is-striped is-fullwidth">
                    <thead>
                        <tr>
                        ${fields.map(field => '<th>' + field + '</th>').join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${self.matrix.map(row => '<tr>' + row.map(value => '<td>' + value + '</td>').join('') + '</tr>').join('')}
                    </tbody>
                </table>`);
            });
        });
    }

    _readRow() {
        if (this.data.length > 0) {
            let start = this.currentIndex;
            const values = [];
            let newLine = false;
            while (newLine === false) {
                let data = '';
                let index = start;
                if (this.data[start] === '"') {
                    while (this.data[index] !== '"' && this.data[index] !== undefined) {
                        data += this.data[index++];
                    }
                    values.push(data);
                    if (/\r|\n/.test(this.data[++index]) || this.data[index] === undefined) {
                        if (this.data[index] === '\r') index++;
                        newLine = true;
                        this.currentIndex = index + 1;
                    } else {
                        start = index + 1;
                    }
                } else {
                    while (!/(\r|\n)|,/.test(this.data[index]) && this.data[index] !== undefined) {
                        if (this.data[index] === '\r') index++;
                        data += this.data[index++];
                    }
                    values.push(data);
                    if (/\r|\n/.test(this.data[index]) || this.data[index] === undefined) {
                        if (this.data[index] === '\r') index++;
                        newLine = true;
                        this.currentIndex = index + 1;
                    } else {
                        start = index + 1;
                    }
                }
            }
            return values;
        }
    }
}

document.getElementById('file').addEventListener('change', function (ev) {
    const file = ev.target.files[0];
    if (/\.csv$/.test(file.name)) {
        // file error message
        fileSelector.classList.remove('is-danger');
        fileError.style.display = 'none';

        document.querySelector('.file-name').textContent = file.name;
        downloads.fileName = file.name.substr(0, file.name.length - 4);
    
        const reader = new FileReader();
        reader.onload = function () {
            csv = new CSV(reader.result, true);
            document.querySelector('#raw').firstChild.textContent = csv.data;

            csv.toHTMLTable().then(html => {
                document.querySelector('#table').innerHTML = html;
                return csv.toJSON();
            }).then(json => {
                document.getElementById('json').appendChild(renderjson(json));
                downloads.json = 'data:text/json;charset=utf-8,' + JSON.stringify(json);
                return csv.toXML();
            }).then(xml => {
                downloads.xml = 'data:text/xml;charset=utf-8,' + xml;
                document.querySelector('#xml').firstChild.innerHTML = xml;
                document.querySelector('.tab-csv[data-tab="table"]').click();
                document.querySelector('.tab-result[data-tab="json"]').click();
            });

            btnDownload.style.display = '';
        };
    
        reader.readAsText(file);
    } else {
        fileSelector.classList.add('is-danger');
        fileError.style.display = '';    
    }
});

document.querySelectorAll('.tab-csv').forEach(e => {
    e.addEventListener('click', (ev) => {
        const tab = ev.currentTarget;
        if (csv !== null) {
            if (let csvDisplay !== tab.dataset.tab) {
                document.querySelector(`#${tab.dataset.tab}`).style.display = '';
                if (let csvDisplay) {
                    document.querySelector(`#${let csvDisplay}`).style.display = 'none';
                    document.querySelector(`.tab-csv[data-tab="${let csvDisplay}"]`).classList.remove('is-active');
                }
                tab.classList.add('is-active');
                let csvDisplay = tab.dataset.tab;
            }
        }
    });
});

document.querySelectorAll('.tab-result').forEach(e => {
    e.addEventListener('click', (ev) => {
        const tab = ev.currentTarget;
        if (window.csv !== null) {
            if (resultDisplay !== tab.dataset.tab) {
                btnDownload.setAttribute('href', downloads[tab.dataset.tab]);
                btnDownload.setAttribute('download', downloads.fileName + '.' + tab.dataset.tab);
                document.querySelector(`#${tab.dataset.tab}`).style.display = '';
                if (resultDisplay) {
                    document.querySelector(`#${resultDisplay}`).style.display = 'none';
                    document.querySelector(`.tab-result[data-tab="${resultDisplay}"]`).classList.remove('is-active');
                }
                tab.classList.add('is-active');
                resultDisplay = tab.dataset.tab;
            }
        }
    });
});
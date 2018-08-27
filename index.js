let csv = null;
let csvDisplay = false;
let resultDisplay = false;
const fileSelector = document.querySelector('#file-selector');
const fileError = document.querySelector('#file-error');
const btnDownload = document.querySelector('#btn-download');
const jsonDisplayer = document.querySelector('#json');
const csvTabs = document.querySelectorAll('.tab-csv');
const resultTabs = document.querySelectorAll('.tab-result');
const downloads = {
    fileName: '',
    json: '',
    xml: ''
};

const NL = navigator.platform.indexOf('Win') !== - 1 ? '\r\n' : '\n';

class CSV {
    constructor(str, hasHeader) {
        this.data = str;
        this.hasHeader = hasHeader;
        this.currentIndex = 0;
        this.dataStartIndex = undefined;
    }

    fields() {
        const self = this;
        self.currentIndex = 0;
        return new Promise((resolve, reject) => {
            try {
                const props = self._readRow();
                if (self.hasHeader) {
                    self.dataStartIndex = self.currentIndex;
                    resolve (props);
                } else {
                    self.dataStartIndex = self.currentIndex = 0;
                    const costumeProps = [];
                    for (let i = 0, length = props.length; i < length; i++)
                        costumeProps.push(['field ' + (i + 1)]);
                    resolve(costumeProps);
                }
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
                    props = props.map(prop => prop.replace(/\s/g, '-'));
                    props = props.map(prop => prop.replace(/\"/g, ''));
                    props = props.map(prop => prop.replace(/\'/g, ''));
                    resolve('<table>' + NL +
                        self.matrix.map(row => {
                            return '\t<row>' + NL +
                                row.map((v, i) => {
                                    return '\t\t<' + props[i] + '>' + v + '</' + props[i] + '>' + NL;
                                }).join('') +
                            '\t</row>' + NL;
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
                <table class="table is-striped">
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
                    index++;
                    let endOfSrting = false;
                    while (!endOfSrting && this.data[index] !== undefined) {
                        if (this.data[index] !== '"')
                            data += this.data[index++];
                        else {
                            if (this.data[index + 1] === '"') {
                                data += this.data[index];
                                index += 2;
                            } else {
                                endOfSrting = true;
                                index++;
                            }
                        }
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
            csv = new CSV(reader.result, document.querySelector('#has-header').checked);
            document.querySelector('#raw').firstChild.textContent = csv.data;

            csv.toHTMLTable().then(html => {
                document.querySelector('#table').innerHTML = html;
                return csv.toJSON();
            }).then(json => {
                if (jsonDisplayer.firstChild)
                    jsonDisplayer.removeChild(jsonDisplayer.firstChild);
                jsonDisplayer.appendChild(renderjson(json));
                downloads.json = 'data:text/json;charset=utf-8,' + JSON.stringify(json);
                return csv.toXML();
            }).then(xml => {
                downloads.xml = 'data:text/xml;charset=utf-8,' + xml;
                document.querySelector('#xml').firstChild.textContent = xml;
                document.querySelector('#tab-table').click();
                document.querySelector('#tab-json').click();
            });

            btnDownload.style.display = '';
        };
    
        reader.readAsText(file);
    } else {
        fileSelector.classList.add('is-danger');
        fileError.style.display = '';
        jsonDisplayer.removeChild(jsonDisplayer.firstChild);
        csvTabs.forEach(e => e.classList.remove('is-active'));
        resultTabs.forEach(e => e.classList.remove('is-active'));
        document.querySelectorAll('.tab-content').forEach(e => e.style.display = 'none');
        csvDisplay = resultDisplay = false;
    }
});

csvTabs.forEach(e => {
    e.addEventListener('click', (ev) => {
        const tab = ev.currentTarget;
        if (csv !== null) {
            if (csvDisplay !== tab.dataset.tab) {
                document.querySelector(`#${tab.dataset.tab}`).style.display = '';
                if (csvDisplay) {
                    document.querySelector(`#${csvDisplay}`).style.display = 'none';
                    document.querySelector(`#tab-${csvDisplay}`).classList.remove('is-active');
                }
                tab.classList.add('is-active');
                csvDisplay = tab.dataset.tab;
            }
        }
    });
});

resultTabs.forEach(e => {
    e.addEventListener('click', (ev) => {
        const tab = ev.currentTarget;
        if (window.csv !== null) {
            if (resultDisplay !== tab.dataset.tab) {
                btnDownload.setAttribute('href', downloads[tab.dataset.tab]);
                btnDownload.setAttribute('download', downloads.fileName + '.' + tab.dataset.tab);
                document.querySelector(`#${tab.dataset.tab}`).style.display = '';
                if (resultDisplay) {
                    document.querySelector(`#${resultDisplay}`).style.display = 'none';
                    document.querySelector(`#tab-${resultDisplay}`).classList.remove('is-active');
                }
                tab.classList.add('is-active');
                resultDisplay = tab.dataset.tab;
            }
        }
    });
});

document.querySelector('#date').textContent = (function() {
    const date = new Date();
    let month = '';
    switch (date.getMonth()) {
    case 0: month = 'Enero'; break;
    case 1: month = 'Febrero'; break;
    case 2: month = 'Marzo'; break;
    case 3: month = 'Abril'; break;
    case 4: month = 'Mayo'; break;
    case 5: month = 'Junio'; break;
    case 6: month = 'Julio'; break;
    case 7: month = 'Agosto'; break;
    case 8: month = 'Septiembre'; break;
    case 9: month = 'Octubre'; break;
    case 10: month = 'Noviembre'; break;
    case 11: month = 'Diciembre'; break;
    }
    return date.getDate() + ' de ' + month + ' de ' + date.getFullYear();
})();

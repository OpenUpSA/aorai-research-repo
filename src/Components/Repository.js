import React, { useEffect, useState } from 'react';

import axios from 'axios';

import getCountryISO2 from 'country-iso-3-to-2';
import ReactCountryFlag from 'react-country-flag';

import { Icon } from '@mdi/react';
import {  mdiInformationSlabCircle, mdiSortAlphabeticalAscending, mdiSortAlphabeticalDescending } from '@mdi/js';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import Popover from 'react-bootstrap/Popover';
import Modal from 'react-bootstrap/Modal';

import { MultiSelect } from "react-multi-select-component";

const truncateString = (str, n) => {
    if (str.length > n) {
        return str.slice(0, n) + '...';
    } else {
        return str;
    }
}


function Repository() {
    const api = {
        base_url: 'https://nocodb.openup.org.za/api/v1/db/data/v1/AORAI2'
    }
    const [sectors, setSectors] = useState([]);
    const [selectedSectors, setSelectedSectors] = useState([]);
    const [selectedCountries, setSelectedCountries] = useState([]);
    const [countries, setCountries] = useState([]);
    const [regions, setRegions] = useState([]);
    const [research, setResearch] = useState([]);
    const [researchTypes, setResearchTypes] = useState([
        {
            name: 'Technology development and applications',
            value: 'Technology development and applications'
        },
        {
            name: 'Public policy and ethics',
            value: 'Public policy and ethics'
        },
        {
            name: 'Business and commercial',
            value: 'Business and commercial'
        },
        {
            name: 'Mixed',
            value: 'Mixed'
        }
    ]);
    const [selectedResearchTypes, setSelectedResearchTypes] = useState([]);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('Original title');
    const [showModal, setShowModal] = useState(false);
    const [modalData, setModalData] = useState({});

    useEffect(() => {

        getRecords('Country', { limit: 250 });
        getRecords('Regional grouping - geo', { limit: 250 });
        getRecords('Regional grouping - income', { limit: 250 });
        getRecords('Sectors', { limit: 250 });
        getResearch();

    }, []);

    useEffect(() => {

        getResearch();

    }, [selectedSectors, selectedCountries, selectedResearchTypes, sort, search]);


    const getRecords = (table, params) => {
        
        axios.get(api.base_url + '/' + table, {
            headers: {
                'xc-token': process.env.API_KEY
            },
            params: params
        }).then(function(response) {

            if(table === 'Country') {
                setCountries(response.data.list);
            } else if(table === 'Sectors') {
                setSectors(response.data.list);
            } else if(table === 'Regional grouping - geo') {
                setRegions(response.data.list);
            } else if(table === 'Regional grouping - income') {
                setRegions(regions.concat(response.data.list));
            }

        }).catch(function(error) {
            console.log(error);
        });
    
    }

    const getResearch = () => {

        let countryWhere = '';
        let sectorsWhere = '';
        let searchWhere = '';
        let researchTypeWhere = '';
        let publish_to_website = true;
        let whereClauses = [];

        if(selectedCountries.length) {
            countryWhere = '(Country,in,' + selectedCountries.map(country => country.label).join(',') + ')~or(Regional grouping - geo,in,' + selectedCountries.map(country => country.label).join(',') + ')~or(Regional grouping - income,in,' + selectedCountries.map(country => country.label).join(',') + '))';
            whereClauses.push(countryWhere);
        }
        if (selectedSectors.length) {
            sectorsWhere = '(Sectors,in,' + selectedSectors.map(sector => sector.label).join(',') + ')';
            whereClauses.push(sectorsWhere);
        }
        if (selectedResearchTypes.length) {
            researchTypeWhere = '(Research type,in,' + selectedResearchTypes.map(researchType => researchType.value).join(',') + ')';
            whereClauses.push(researchTypeWhere);
        }
        if (search != '') {
            searchWhere = '(Original title,like,%' + search + '%)';
            whereClauses.push(searchWhere);
        }

        if (publish_to_website) {
            let publish = '(Analysis status,eq,Publish to website)';
            whereClauses.push(publish);
        }

        let where = whereClauses.join('~and');

        let params = {
            limit: 250,
            'nested[Country][fields]': 'Country name,Country code',
            where: where,
            sort: sort
        }

        axios.get(api.base_url + '/Research Directory', {
            headers: {
                'xc-token': process.env.API_KEY
            },
            params: params
        }).then(function(response) {
            setResearch(response.data.list);
        }).catch(function(error) {
            console.log(error);
        });
    }

    const selectSectors = (e) => {
        setSelectedSectors(e);
    }

    const selectCountries = (e) => {
        setSelectedCountries(e);
    }

    const selectResearchTypes = (e) => {
        setSelectedResearchTypes(e);
    }

    const showRecord = (record) => {
        setModalData(record);
        setShowModal(true);
    }

    const sortBy = (col) => {
        if(sort === col) {
            col = '-' + col;
        }
        setSort(col);
    }

    useEffect(() => {
        
        countries.sort((a, b) => (a['Country name'] > b['Country name']) ? 1 : -1);

    }, [countries]);

    const ItemRenderer = ({ checked, option, onClick, disabled }) => {
        if (option.value === 'Regions' || option.value === 'Countries') {
          return <div className="fw-bold fs-6">{option.label}</div>;
        } else {
          return (
            <label>
              <input type="checkbox" onChange={onClick} checked={checked} tabIndex={-1} disabled={disabled} /> {option.label}
            </label>
          );
        }
    };
    
    return (
        <>
        <Container className="py-5">
            <Row className="mb-3">
                <Col>
                    <h1 className="fs-4">Research Directory</h1>
                </Col>
            </Row>
            <Row>
                <Col>
                    <Form.Control type="search" placeholder="Search for a keyword..." onKeyUp={ e => setSearch(e.target.value) }/>
                </Col>
                <Col md={3}>
                    <MultiSelect
                        options={sectors.map(sector => { return { label: sector['Sector'], value: sector['Sector'] } })}
                        value={selectedSectors}
                        onChange={e => selectSectors(e) }
                        valueRenderer={
                            (selected, _options) => {
                                return selected.length
                                  ? selected.length + " Sectors Selected"
                                  : "Sectors";
                            }
                        }
                    />
                </Col>
                <Col md={3}>
                    <MultiSelect
                        options={[{'Country name': 'Regions', 'Country code': 'Regions'}].concat(regions).concat([{'Country name': 'Countries', 'Country code': 'Countries'}]).concat(countries).map(cntryreg => { return { label: cntryreg['Country name'] ? cntryreg['Country name'] : cntryreg['Region name'], value: cntryreg['Country code'] ? cntryreg['Country code'] : cntryreg['Region name'], disabled: (cntryreg['Country name'] == 'Regions' || cntryreg['Country name'] == 'Countries') ? true : false } })}
                        value={selectedCountries}
                        onChange={e => selectCountries(e) }
                        valueRenderer={
                            (selected, _options) => {
                                return selected.length
                                  ? selected.length + " Selected"
                                  : "Countries and Regions";
                            }
                        }
                        ItemRenderer={ItemRenderer}
                    />
                </Col>
                

                <Col md={2}>
                    <MultiSelect
                        options={researchTypes.map(type => { return { label: type.name, value: type.value } })}
                        value={selectedResearchTypes}
                        onChange={e => selectResearchTypes(e) }
                        valueRenderer={
                            (selected, _options) => {
                                return selected.length
                                  ? selected.length + " Research Types Selected"
                                  : "Research Types";
                            }
                        }
                    />
                </Col>
              
                
            </Row>
            <Row>
                <Col>
                    <Table hover className="mt-4" responsive>
                        <thead>
                            <tr>
                                <th onClick={() => sortBy('Original title')} className="cursor-pointer" style={{ minWidth: '300px' }}>
                                    <Row>
                                        <Col>Resource <Icon color="#6c6d6d" path={sort.includes('-') ? mdiSortAlphabeticalDescending : mdiSortAlphabeticalAscending} size={0.8} /></Col>
                                    </Row>
                                </th>
                                <th style={{ minWidth: '250px' }}>Sectors</th>
                                <th style={{ minWidth: '150px' }}>Countries</th>
                                <th onClick={() => sortBy('Research type')} style={{ minWidth: '200px' }}>Research Type</th>
                                <th>Year</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                research.map((record,index) => {
                                    return <tr key={index} onClick={() => showRecord(record)} className="research-item">
                                        <td width="45%">
                                            <Row>
                                                <Col><span className="research-title" title={record['Original title']}>{truncateString(record['Original title'], 70)}</span></Col>
                                                <Col xs="auto">
                                                    <OverlayTrigger overlay={
                                                        <Tooltip className="summary_tooltip">
                                                            {truncateString(record['Original long summary'], 200)}
                                                        </Tooltip>
                                                    }>
                                                        <Icon color="#6c6d6d" path={mdiInformationSlabCircle} size={1} />
                                                    </OverlayTrigger>
                                                </Col>
                                            </Row>
                                            
                                        </td>
                                        <td>
                                            {
                                                record['Sectors'].map((sector, index) => {

                                                    if(index < 2) {
                                                        return <div className="chip" key={index}>{sector ? sector['Sector'] : ''}</div>
                                                    }

                                                    if(record['Sectors'].length > 2) {
                                                        return <OverlayTrigger overlay={<Tooltip className="summary_tooltip">
                                                            {
                                                                record['Sectors'].map((country, index) => {
                                                                    return index > 1 && sector['Sector']     
                                                                })
                                                            }
                                                        </Tooltip>}>
                                                            <div className="chip">...</div>
                                                        </OverlayTrigger>
                                                    }
                                                })
                                            }
                                        </td>
                                        <td>
                                            {
                                                record['Country'].concat(record['Regional grouping - geo']).concat(record['Regional grouping - income']).map((cntryreg, index) => {
                                                    
                                                    if(index < 2 && cntryreg != null) {
                                                        return <div className="chip" key={index}>{cntryreg ? 
                                                            <>
                                                                {
                                                                    cntryreg['Country name'] ? 
                                                                        <>
                                                                            <div style={{width: '1.4em', height: '1.4em', borderRadius: '50%', overflow: 'hidden', position: 'relative', display: 'inline-block', top: '3px', backgroundColor: '#ccc'}} className="border">
                                                                                <ReactCountryFlag 
                                                                                    countryCode={getCountryISO2(cntryreg['Country code'])}
                                                                                    svg
                                                                                    style={{
                                                                                        position: 'absolute', 
                                                                                        top: '30%',
                                                                                        left: '30%',
                                                                                        marginTop: '-50%',
                                                                                        marginLeft: '-50%',
                                                                                        fontSize: '1.8em',
                                                                                        lineHeight: '1.8em',
                                                                                    }} 
                                                                                />
                                                                            </div> {cntryreg['Country name']}
                                                                        </> 
                                                                    : <div>{cntryreg['Region name']}</div>
                                                                }
                                                            </> : ''}
                                                        </div>

                                                    }
                                                    
                                                    if(record['Country'].concat(record['Regional grouping - geo']).concat(record['Regional grouping - income']).length > 3) {
                                                        
                                                        return <OverlayTrigger overlay={<Tooltip className="summary_tooltip">
                                                            {
                                                                record['Country'].concat(record['Regional grouping - geo']).concat(record['Regional grouping - income']).map((cntryreg, index) => {
                                                                    return index > 1 && cntryreg != null && (cntryreg['Country name'] ? cntryreg['Country name'] : cntryreg['Region name']);
                                                                })
                                                            }
                                                        </Tooltip>}>
                                                            <div className="chip">...</div>
                                                        </OverlayTrigger>
                                                    }
                                                    
                                                })
                                            }
                                        </td>
                                        <td>
                                            {
                                                <span title={record['Research type']}>{truncateString(record['Research type'],25)}</span>
                                            }
                                        </td>
                                        <td>
                                            {
                                                record['Year published'].map((year, index) => {
                                                    return <div className="chip" key={index}>{year ? year['Year'] : ''}</div>
                                                })
                                            }
                                        </td>
                                    </tr>
                                })
                            }
                            
                        </tbody>
                    </Table>
                </Col>
            </Row>
        </Container>
        <Modal show={showModal} size="lg" onHide={() => setShowModal(false)}>
            <Modal.Header closeButton></Modal.Header>
            <Modal.Body>
                <dl className="row">
                    <dt className="col-sm-3">Original Title</dt>
                    <dd className="col-sm-9"><span className="fs-5 fw-bold">{modalData['Original title']}</span></dd>
                    <hr/>
                    {modalData['English title'] && <>
                        <dt className="col-sm-3">English Title</dt>
                        <dd className="col-sm-9"><span className="fs-5 fw-bold">{modalData['English title']}</span></dd>
                        <hr/>
                    </>}
                    {modalData['Research type'] && <>
                        <dt className="col-sm-3">Research Type</dt>
                        <dd className="col-sm-9">{modalData['Research type']}</dd>
                        <hr/>
                    </>}
                    {(modalData['Authors'] && modalData['Authors'].length > 0) && <>
                        <dt className="col-sm-3">Authors</dt>
                        <dd className="col-sm-9">{modalData['Authors'].map((author,index) => {
                            if(index > 0) { 
                                return <span key={index}>, {author['Full name']}</span>
                            } else {
                                return <span key={index}>{author['Full name']}</span>
                            }

                        })}</dd>
                        <hr/>
                    </>}
                    {((modalData['Country'] && modalData['Country'].length > 0) || (modalData['Regional grouping - geo'] && modalData['Regional grouping - geo'].length > 0) || (modalData['Regional grouping - income'] && modalData['Regional grouping - income'].length > 0)) && <>
                        <dt className="col-sm-3">Countries/Regions</dt>
                        <dd className="col-sm-9">{modalData['Country'].concat(modalData['Regional grouping - geo']).concat(modalData['Regional grouping - income']).map((cntryreg, index) => {
                            return <div className="chip" key={index}>{cntryreg ? 
                                <>
                                    {
                                        cntryreg['Country name'] ? 
                                            <>
                                                <div style={{width: '1.4em', height: '1.4em', borderRadius: '50%', overflow: 'hidden', position: 'relative', display: 'inline-block', top: '3px', backgroundColor: '#ccc'}} className="border">
                                                    <ReactCountryFlag 
                                                        countryCode={getCountryISO2(cntryreg['Country code'])}
                                                        svg
                                                        style={{
                                                            position: 'absolute', 
                                                            top: '30%',
                                                            left: '30%',
                                                            marginTop: '-50%',
                                                            marginLeft: '-50%',
                                                            fontSize: '1.8em',
                                                            lineHeight: '1.8em',
                                                        }} 
                                                    />
                                                </div> {cntryreg['Country name']}
                                            </> 
                                        : <div>{cntryreg['Region name']}</div>
                                    }
                                </> : ''}
                            </div>
                        })}</dd>
                        <hr/>
                    </>}
                    
                    <dt className="col-sm-3">Links</dt>
                    <dd className="col-sm-9">
                        {modalData['External URL'] != '' && <a target="_blank" href={modalData['External URL']} className="chip">External Link</a>}
                        {(modalData['Attachment'] && modalData['Attachment'].length > 0) && modalData['Attachment'].map((attachment, index) => {
                            return <a key={index} target="_blank" href={'https://nocodb.openup.org.za/' + attachment.path} className="chip">Attachment</a>

                        })
                        } 
                    </dd>
                    <hr/>
                    {modalData['Original long summary'] && <>
                        <dt className="col-sm-3">Summary</dt>
                        <dd className="col-sm-9">{truncateString(modalData['Original long summary'], 700)}</dd>
                    </>}
                </dl>
                
            </Modal.Body>
        </Modal>
        </>
    )

}

export default Repository;
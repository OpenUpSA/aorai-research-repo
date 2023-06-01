import React, { useEffect, useState } from 'react';
import ReactDOMServer from 'react-dom/server';

import axios from 'axios';

import { Icon } from '@mdi/react';
import { mdiFilterOutline, mdiCogOutline } from '@mdi/js';

import { Card, Container, Row, Col, Accordion, Button } from 'react-bootstrap';
import Spinner from 'react-bootstrap/Spinner';

import { Animate, AnimateKeyframes, AnimateGroup } from "react-simple-animate";

import { MultiSelect } from 'react-multi-select-component';

import { MapContainer, GeoJSON, LayerGroup, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import getCountryISO2 from 'country-iso-3-to-2';
import ReactCountryFlag from 'react-country-flag';

import * as allCountries from '../data/countries.geo.json';
import * as africanCountries from '../data/african-countries.json';
import * as centroids from '../data/centroids.geo.json';

import BarChart from './BarChart';
import countryIso3To2 from 'country-iso-3-to-2';



function Map() {
    const api = {
        base_url: 'https://nocodb.openup.org.za/api/v1/db/data/v1/AORAI'
    }
    const [loading, setLoading] = useState(true);
    const [loadingText, setLoadingText] = useState('Loading...');
    const [position, setPosition] = useState([-7, 22]);
    const [policyAreas, setPolicyAreas] = useState([]);
    const [selectedPolicyAreas, setSelectedPolicyAreas] = useState([]);
    const [activePolicyAreas, setActivePolicyAreas] = useState([]);
    const [policiesData, setPoliciesData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [recentData, setRecentData] = useState([]);
    const [refreshMap, setRefreshMap] = useState(1);
    const [refreshChart, setRefreshChart] = useState(1);
    const [showSection, setShowSection] = useState('map');


    // const [years, setYears] = useState([]);

    useEffect(() => {

        // Get all Policies

        setLoadingText('Fetching Data');

        axios.get(api.base_url + '/Policy and Governance Map', {
            headers: {
                'xc-token': process.env.API_KEY
            },
            params: {
                limit: 150,
                fields: 'Original title,English title,External URL,Country,Year,Analysis status,Observatory AI policy areas - primary,Observatory AI policy areas - secondary',
                'nested[Country][fields]': 'Country name,Country code',
                'nested[Observatory AI policy areas - primary][fields]': 'Policy area, policy_label',
                'nested[Observatory AI policy areas - secondary][fields]': 'Policy area, policy_label',
                where: '(Country,isnot,null)',
                // where: '(Analysis status,eq,Publish to website)~and(Country,isnot,null)',
            }
        }).then(function(response) {

            let queries = [];

            for (let count = 0; count < Math.ceil(response.data.pageInfo.totalRows / 150); count++) {
                let offset = count > 0 ? '?offset=' + (count * 150) : '';
                queries.push(api.base_url + '/Policy and Governance Map' + offset);
            }

            let queries_get = [];

            for (let query = 0; query < queries.length; query++) {
                
                queries_get.push(axios.get(queries[query], { 
                    headers: {
                        'xc-token': process.env.API_KEY
                    },
                    params: {
                        limit: 150,
                        fields: 'Original title,English title,External URL,Country,Year,Analysis status,Observatory AI policy areas - primary,Observatory AI policy areas - secondary',
                        'nested[Country][fields]': 'Country name,Country code',
                        'nested[Observatory AI policy areas - primary][fields]': 'Policy area,policy_label',
                        'nested[Observatory AI policy areas - secondary][fields]': 'Policy area,policy_label',
                        where: '(Country,isnot,null)',
                        // where: '(Analysis status,eq,Publish to website)~and(Country,isnot,null)',
                    }
                }))

            }

            axios.all(queries_get).then(axios.spread((...responses) => {

                let policies_data = [];

                for (let count = 0; count < responses.length; count++) {
                    let response = responses[count];
                    policies_data = policies_data.concat(response.data.list);
                }

                setPoliciesData(policies_data);
                
            })).catch(error => {
                console.log(error);
            })

        })

        // Get POLICY AREAS data
        axios.get(api.base_url + '/Observatory AI policy areas', {
            headers: {
                'xc-token': process.env.API_KEY
            }
        }).then(function(response) {
            setPolicyAreas(response.data.list);
        })

        
    }, []);

   


    useEffect(() => {
        
        if (policiesData.length) {
            
            setLoading(false);

            let tempData = policiesData.reduce((r, a) => {
                r[a.Country[0]['Country code']] = [...r[a.Country[0]['Country code']] || [], a];
                return r;
            }, {});
            
            setPoliciesData(tempData);
            setFilteredData(tempData);

        }

    }, [policiesData]);
   

    useEffect(() => {

        if(!selectedPolicyAreas.length) {
            setFilteredData(policiesData);
            return;
        }

        let tempData = {};

        Object.keys(policiesData).forEach(key=>{
            let policies = policiesData[key];
            let filteredPolicies = policies.filter((policy) => {
                let policy_areas = policy['Observatory AI policy areas - primary'].map(policy_area => policy_area.policy_label);
                return policy_areas.some(r=> selectedPolicyAreas.indexOf(r) >= 0);
            });
            tempData[key] = filteredPolicies;
        })

        setFilteredData(tempData);


    }, [selectedPolicyAreas]);


    const getPolicyCount = (iso_code) => {

        if(filteredData[iso_code]) {
            return filteredData[iso_code].length;
        } else {
            return 0;
        }

    }

    const selectPolicy = (e) => {

        let policy = e.target.value;
        let checked = e.target.checked;

        if (checked) {
            setSelectedPolicyAreas([...selectedPolicyAreas, policy]);
        } else {
            setSelectedPolicyAreas(selectedPolicyAreas.filter((item) => item !== policy));
        }
        

    }

    const itemsCount = (data) => {
        
        let policyCount = 0;

        // Go through all data keys
        Object.keys(data).forEach(key=>{
            policyCount += data[key].length;
        })

        return policyCount;

    }

    


    const toggleAllPolicyAreas = (e) => {

        return;

    }


    const updateTooltips = () => {

        Object.keys(filteredData).forEach(key=>{
            let tooltip = document.getElementById('iso-' + key);
            if (tooltip) {
                tooltip.innerHTML = getPolicyCount(key);
            }
        })

        setRefreshMap(refreshMap + 1);

    }

    useEffect(() => {

        updateTooltips();
        updateBarChart();

        let recentDataTemp = [];

        Object.keys(filteredData).forEach(key=>{
            recentDataTemp = [...recentDataTemp,filteredData[key]];
        })

        let recentDataTemp1 = recentDataTemp.reduce((a, b) => a.concat(b), []);

        // Drop policies without year
        recentDataTemp1 = recentDataTemp1.filter((policy) => {
            return policy.Year.length;
        });

        // Drop if year == 9999
        recentDataTemp1 = recentDataTemp1.filter((policy) => {
            return policy.Year[0].Year != 9999;
        });

        recentDataTemp1.forEach((policy) => {

            // polic.Year is an array of objects. Get the one with the most recent Year property
            let year = policy.Year.reduce((a, b) => {
                return a.Year > b.Year ? a : b;
            });


            policy.recent_year = year.Year;

        });

        // Sort by year
        recentDataTemp1.sort((a, b) => (a.recent_year > b.recent_year) ? -1 : 1);

            
 



        setRecentData(recentDataTemp1);

        console.log(recentDataTemp1);


    }, [filteredData]);

    // useEffect(() => {

        // if(!showTable) {
        //     document.body.classList.add('bg');
        // } else {
        //     document.body.classList.remove('bg');
        // }

    // },[showTable]);

    const updateBarChart = () => {

        let activePolicyAreas = [];

        Object.keys(filteredData).forEach((key)=>{
            filteredData[key].forEach((policy)=>{
                policy.policyAreas = policy['Observatory AI policy areas - primary'];
                policy.policyAreas.forEach((policyArea)=>{
                    let policyAreaIndex = activePolicyAreas.findIndex((obj)=>{return obj.policy_area === policyArea.policy_label});
                    if(policyAreaIndex === -1){
                        activePolicyAreas.push({policy_area:policyArea.policy_label, count:1});
                    }else{
                        activePolicyAreas[policyAreaIndex].count++;
                    }


                });
            });
        });

        setActivePolicyAreas(activePolicyAreas);

    }

    

    const style = (feature) => {

        const scale = (value) => {
            
            return value < 1 ? '#dfdfdf' :
            value > 0 && value < 11 ? '#dee2e1' :
            value > 10 && value < 21 ? '#bfd4d3' :
            value > 20 && value < 41 ? '#80aaa8' : 
            value > 41 ? '#3c7a77' : '#dfdfdf';

        }


        return {
            fillColor: africanCountries.map(country => country.iso_code).includes(feature.id) ? scale(getPolicyCount(feature.id)) : '#e3e7e5',
            weight: 0.5,
            opacity: 1,
            color: '#fff',
            dashArray: '0',
            fillOpacity: 1,
        };

    }



   


    const onEachFeature = (feature, layer) => {
        if (feature) {

            if (africanCountries.map(country => country.iso_code).includes(feature.id)) {
                layer.bindTooltip(`<div class="country-tooltip"><div class="iso-code">${getCountryISO2(feature.id)}</div><div class="policy-count" id="iso-${feature.id}">${getPolicyCount(feature.id)}</div></div>`, { permanent: true, direction: "center" });
            }

            let popupContent = ReactDOMServer.renderToString(
                <>
                    <div style={{width: '1.4em', height: '1.4em', borderRadius: '50%', overflow: 'hidden', position: 'relative', display: 'inline-block', top: '5px', backgroundColor: '#ccc'}} className="border">
                        <ReactCountryFlag 
                            countryCode={getCountryISO2(feature.id)}
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
                        </div>{feature.properties.name}
                        {getPolicyCount(feature.id)}
                        <BarChart data={activePolicyAreas} chartid={feature.id} refreshChart={refreshChart}/>

                </>
            );

            layer.bindPopup(popupContent);

        }



        layer.on({
            click: (e) => {
                let layer = e.target;
                layer.setStyle({
                    fillOpacity: 0.6,
                });
                layer.bringToFront();
                layer.openPopup();
                setRefreshChart(refreshChart + 1);

            }
        });

        layer.on({
            mouseover: (e) => {
                let layer = e.target;
                layer.setStyle({
                    fillOpacity: 0.6,
                });
            }
        });

        layer.on({
            mouseout: (e) => {
                let layer = e.target;
                layer.setStyle({
                    fillOpacity: 1,
                });
            }
        });


    }

    return (

        
        loading ?

            <div className="position-absolute top-50 start-50 translate-middle text-center">
                <Spinner animation="grow" /><br/>
                <span className="text-uppercase fs-5 fw-bold">{loadingText}</span>
            </div>
        
        :
        
        <div className="policy-map position-relative">
            <AnimateGroup play>
                {
                    showSection == 'map' &&
                        <MapContainer
                            className="map-container"
                            center={position}
                            zoom={4}
                            scrollWheelZoom={false}
                            zoomControl={false}

                        >
                            <LayerGroup>
                                <GeoJSON data={allCountries} style={style} onEachFeature={onEachFeature} refresh={refreshMap}/>
                            </LayerGroup>
                        </MapContainer>
                }
                
                
                <Container fluid className="controls-overlay py-2 pe-none">
                    <Row className="pe-none">
                        <Col md={3} className="pe-auto">

                            {/* FILTERS */}
                            <Animate start={{ opacity: 0, filter: 'blur(10px)' }} end={{ opacity: 1, filter: 'blur(0)' }} sequenceIndex={1}>
                                <Card className="shadow-sm border-0 rounded sticky-top">
                                    <Card.Body className="py-0">
                                        <Accordion defaultActiveKey="0" flush>
                                            <Accordion.Item eventKey="0">
                                                <Accordion.Header>
                                                    <Icon path={mdiFilterOutline} size={1} /> <div>FILTERS</div>
                                                </Accordion.Header>
                                                <Accordion.Body className="px-1">
                                                    <div className="scrollarea" style={{ height: '300px' }}>
                                                        <h2>FOCUS AREAS</h2>
                                                        <Row className="mb-2 p-1 list-item-bg">
                                                            <Col>
                                                                <label>All</label>
                                                            </Col>
                                                            <Col xs="auto">
                                                                <input type="checkbox" value="all" onChange={toggleAllPolicyAreas}/>
                                                            </Col>
                                                        </Row>
                                                        {
                                                            policyAreas.map((policy_area, index) => {
                                                                return (
                                                                    <Row key={index} className="mb-2 p-1 list-item-bg">
                                                                        <Col>
                                                                            <label>{policy_area['Policy area']}</label>
                                                                        </Col>
                                                                        <Col xs="auto">
                                                                            <input type="checkbox" value={policy_area.policy_label} onChange={selectPolicy} />
                                                                        </Col>
                                                                    </Row>
                                                                )
                                                            })
                                                        }
                                                    </div>
                                                </Accordion.Body>
                                            </Accordion.Item>
                                        </Accordion>
                                    </Card.Body>
                                </Card>
                            </Animate>

                            {/* SETTINGS */}
                            <Animate start={{ opacity: 0, filter: 'blur(10px)' }} end={{ opacity: 1, filter: 'blur(0)' }} sequenceIndex={2}>
                                <Card className="mt-3 shadow-sm border-0 rounded">
                                    <Card.Body className="py-0">
                                        <Accordion defaultActiveKey="0" flush>
                                            <Accordion.Item eventKey="0">
                                                <Accordion.Header>
                                                    <Icon path={mdiCogOutline} size={1} /> <div>SETTINGS</div>
                                                </Accordion.Header>
                                                <Accordion.Body>
                                                    <h2>DATE SETTINGS</h2>
                                                </Accordion.Body>
                                            </Accordion.Item>
                                        </Accordion>
                                    </Card.Body>
                                </Card>
                            </Animate>

                        </Col>
                        <Col className="pe-none">
                            <Animate start={{ opacity: 0, filter: 'blur(10px)' }} end={{ opacity: 1, filter: 'blur(0)' }} sequenceIndex={0}>
                                <div className="d-flex justify-content-center">
                                    <Card className="shadow-sm border-0 rounded pe-auto">
                                        <Card.Body className="p-2">
                                            <Row>
                                                <Col className="pe-1">
                                                    <Button className="rounded-0 w-100" size="sm" variant={showSection == 'map' ? 'primary' : 'light'} onClick={() => setShowSection('map')}>Map</Button>
                                                </Col>
                                                <Col className="px-1">
                                                    <Button className="rounded-0 w-100" size="sm" variant={showSection == 'policies' ? 'primary' : 'light'}onClick={() => setShowSection('policies')}>Policies</Button>
                                                </Col>
                                                <Col className="ps-1">
                                                    <Button className="rounded-0 w-100" size="sm" variant={showSection == 'list' ? 'primary' : 'light'}onClick={() => setShowSection('list')}>List</Button>
                                                </Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>
                                </div>
                            </Animate>

                            {
                                showSection == 'policies' && 
                                    <Row className="mt-2">
                                        <Col>
                                            <div style={{minHeight: '1200px'}}>
                                                {
                                                    recentData.map((item, index) => {
                                                            return (
                                                                <div className="mb-2" key={index}>
                                                                    <Card className="policies-list-item shadow-sm border-0 rounded data-card pe-auto">
                                                                        <Card.Body>
                                                                            <Row key={index} className="mb-2">
                                                                                <Col>
                                                                                    <h4><a href={item['External URL']} target="_blank">{item['English title'] ? item['English title'] : item['Original title']}</a></h4>
                                                                                </Col>
                                                                            </Row>
                                                                            <Row>
                                                                                <Col>
                                                                                    {
                                                                                        item['Country'].map((country, index) => {
                                                                                            return (
                                                                                                <div key={index}>
                                                                                                    <div style={{width: '1.4em', height: '1.4em', borderRadius: '50%', overflow: 'hidden', position: 'relative', display: 'inline-block', top: '5px', backgroundColor: '#ccc'}} className="border">
                                                                                                        <ReactCountryFlag 
                                                                                                            countryCode={getCountryISO2(country['Country code'])}
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
                                                                                                    </div>{country['Country name']}
                                                                                                </div>
                                                                                            )
                                                                                        })

                                                                                    }  
                                                                                </Col>
                                                                                <Col xs="auto">
                                                                                    {
                                                                                        (item.Year.map((year, index) => 
                                                                                            <span key={index}>{year.Year}</span>
                                                                                        ))
                                                                                    }
                                                                                </Col>
                                                                            </Row>
                                                                        </Card.Body>
                                                                    </Card>
                                                                </div>
                                                            )
                                                        })
                                                    }
                                            </div>
                                        </Col>
                                    </Row>
                            }

                            {
                                showSection == 'list' &&
                                <>list</>
                            }
                        
                        </Col>
                        <Col md={3} className="pe-auto">

                            {/* SETTINGS */}
                            <Animate start={{ opacity: 0, filter: 'blur(10px)' }} end={{ opacity: 1, filter: 'blur(0)' }} sequenceIndex={3}>
                                <Card className="shadow-sm border-0 rounded data-card">
                                    <Card.Header>
                                        <MultiSelect
                                            options={allCountries.features.map((country) => {
                                                return {
                                                    label: country.properties.name,
                                                    value: country.properties.id
                                                }
                                            })
                                            }

                                            valueRenderer={
                                                (selected, _options) => {
                                                    return selected.length
                                                        ? selected.length + " Countries Selected"
                                                        : "Countries";
                                                }
                                            }
                                        />
                                    </Card.Header>
                                    <Card.Body>
                                        <div className="scrollarea" style={{ height: '500px' }}>
                                            <h2>HIGHLIGHTS</h2>

                                            <Row className="p-1 mt-2 list-item-bg">
                                                <Col>AI Law and Policy Items</Col>
                                                <Col xs="auto">
                                                    {itemsCount(filteredData)}
                                                </Col>
                                            </Row>

                                            <Row className="p-1 mt-2 list-item-bg">
                                                <Col>Focus Areas</Col>
                                                <Col xs="auto">{activePolicyAreas.length}</Col>
                                            </Row>


                                            <h2 className="mt-3">POLICY AREAS</h2>
                                            <BarChart data={activePolicyAreas} chartid={'all'} selectedPolicyAreas={selectedPolicyAreas} refreshChart={refreshChart}/>
                                            <h2>PUBLISHING TIMELINE</h2>
                                            <h2>RECENTLY PUBLISHED</h2>
                                            <AnimateGroup play>
                                                {
                                                recentData.slice(0,10).map((item, index) => {
                                                            
                                                        return (
                                                            <div className="recently-published p-2 mb-2" key={index}>
                                                                <Row key={index} className="mb-2">
                                                                    <Col>
                                                                        <h4><a href={item['External URL']} target="_blank" rel="noreferrer">{item['English title'] ? item['English title'] : item['Original title']}</a></h4>
                                                                    </Col>
                                                                </Row>
                                                                <Row>
                                                                    <Col>
                                                                        
                                                                    </Col>
                                                                    <Col xs="auto">
                                                                        {
                                                                            (item.Year.map((year, index) => 
                                                                                <span key={index}>{year.Year}</span>
                                                                            ))
                                                                        }
                                                                    </Col>
                                                                </Row>
                                                            </div>
                                                        )
                                                        
                                                    })
                                                }
                                            </AnimateGroup>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Animate>

                        
                        </Col>



                    </Row>
                </Container>
                    

               
               
            </AnimateGroup>
        </div>
    );
}

export default Map;